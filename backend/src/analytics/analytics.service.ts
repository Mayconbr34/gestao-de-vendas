import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ANALYTICS_TZ, DateRange } from '../common/date-range';
import { analyzeDataQuality, ProductRecord } from './data-quality';
import { forecastLinear, kmeans, movingAverage, standardize } from './ml';

/*
 * Todas as consultas usam a mesma convenção de parâmetros:
 *   $1 = empresa (uuid ou NULL para todas), $2 = dia inicial, $3 = dia final, $4 = fuso horário.
 * As agregações são feitas no PostgreSQL (COUNT/SUM/GROUP BY), e não no navegador,
 * para reduzir o volume de dados trafegado e o tempo de resposta.
 */
const COMPANY = (alias: string) => `($1::uuid IS NULL OR ${alias}.company_id = $1)`;
const PERIOD = (column: string) =>
  `${column} >= ($2::date::timestamp AT TIME ZONE $4) AND ${column} < (($3::date + 1)::timestamp AT TIME ZONE $4)`;
const COMPLETED_SALES = `s.status = 'COMPLETED' AND ${COMPANY('s')} AND ${PERIOD('s.created_at')}`;

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const variation = (current: number, previous: number) =>
  previous === 0 ? (current === 0 ? 0 : null) : round(((current - previous) / previous) * 100, 1);

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type ProductSalesRow = {
  key: string;
  product_id: string | null;
  name: string;
  quantity: number;
  revenue: number;
  profit: number | null;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  private params(companyId: string | null, from: string, to: string) {
    return [companyId, from, to, ANALYTICS_TZ];
  }

  /* ─── Visão geral (cadastros, estoque e auditoria) ─────────────────────── */

  async overview(companyId: string | null, range: DateRange) {
    const params = this.params(companyId, range.from, range.to);
    const granularity = range.days > 62 ? 'month' : 'day';

    const [counts] = await this.dataSource.query(
      `SELECT
         (SELECT COUNT(*) FROM products p WHERE ${COMPANY('p')})::int AS products,
         (SELECT COUNT(*) FROM categories c WHERE ${COMPANY('c')})::int AS categories,
         (SELECT COUNT(*) FROM users u WHERE ${COMPANY('u')})::int AS users,
         (SELECT COUNT(*) FROM api_keys k WHERE ${COMPANY('k')})::int AS api_keys,
         (SELECT COUNT(*) FROM fiscal_rules f WHERE ${COMPANY('f')})::int AS fiscal_rules,
         (SELECT COUNT(*) FROM icms_internal_rates r WHERE ${COMPANY('r')})::int AS icms_rates,
         (SELECT COUNT(*) FROM companies co WHERE $1::uuid IS NULL OR co.id = $1)::int AS companies,
         (SELECT COUNT(*) FROM audit_logs a WHERE ${COMPANY('a')} AND ${PERIOD('a.created_at')})::int AS audits,
         (SELECT COALESCE(SUM(p.stock), 0) FROM products p WHERE ${COMPANY('p')})::int AS stock_units,
         (SELECT COALESCE(SUM(p.stock * p.price), 0) FROM products p
            WHERE ${COMPANY('p')} AND p.stock > 0)::float8 AS stock_value_price,
         (SELECT COALESCE(SUM(p.stock * p.cost_price), 0) FROM products p
            WHERE ${COMPANY('p')} AND p.stock > 0 AND p.cost_price IS NOT NULL)::float8 AS stock_value_cost,
         (SELECT COUNT(*) FROM products p WHERE ${COMPANY('p')} AND p.stock <= 0)::int AS out_of_stock`,
      params
    );

    const auditSeries = await this.dataSource.query(
      `WITH buckets AS (
         SELECT generate_series(
                  date_trunc($5, $2::date::timestamp),
                  date_trunc($5, $3::date::timestamp),
                  ('1 ' || $5)::interval
                )::date AS bucket
       ),
       agg AS (
         SELECT date_trunc($5, a.created_at AT TIME ZONE $4)::date AS bucket,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE a.action = 'LOGIN')::int AS logins,
                COUNT(*) FILTER (WHERE a.resource = 'products')::int AS products,
                COUNT(*) FILTER (WHERE a.resource = 'sales')::int AS sales,
                COUNT(*) FILTER (WHERE a.resource IN ('fiscal-rules', 'icms-rates', 'tax-profiles'))::int AS fiscal
           FROM audit_logs a
          WHERE ${COMPANY('a')} AND ${PERIOD('a.created_at')}
          GROUP BY 1
       )
       SELECT to_char(b.bucket, 'YYYY-MM-DD') AS bucket,
              COALESCE(agg.total, 0) AS total,
              COALESCE(agg.logins, 0) AS logins,
              COALESCE(agg.products, 0) AS products,
              COALESCE(agg.sales, 0) AS sales,
              COALESCE(agg.fiscal, 0) AS fiscal
         FROM buckets b
         LEFT JOIN agg ON agg.bucket = b.bucket
        ORDER BY b.bucket`,
      [...params, granularity]
    );

    const auditsByAction = await this.dataSource.query(
      `SELECT a.action, COUNT(*)::int AS count
         FROM audit_logs a
        WHERE ${COMPANY('a')} AND ${PERIOD('a.created_at')}
        GROUP BY a.action
        ORDER BY count DESC
        LIMIT 10`,
      params
    );

    const categories = await this.dataSource.query(
      `SELECT c.name, COUNT(p.id)::int AS products,
              COALESCE(SUM(p.stock), 0)::int AS stock
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
        WHERE ${COMPANY('c')}
        GROUP BY c.id, c.name
        ORDER BY products DESC, c.name`,
      [companyId]
    );

    const fiscalByUf = await this.dataSource.query(
      `SELECT f.uf, COUNT(*)::int AS rules,
              COUNT(*) FILTER (WHERE f.regime = 'SIMPLES')::int AS simples,
              COUNT(*) FILTER (WHERE f.regime = 'NORMAL')::int AS normal
         FROM fiscal_rules f
        WHERE ${COMPANY('f')}
        GROUP BY f.uf
        ORDER BY f.uf`,
      [companyId]
    );

    return {
      period: { from: range.from, to: range.to, days: range.days, granularity },
      counts: {
        products: counts.products,
        categories: counts.categories,
        users: counts.users,
        apiKeys: counts.api_keys,
        fiscalRules: counts.fiscal_rules,
        icmsRates: counts.icms_rates,
        companies: counts.companies,
        audits: counts.audits
      },
      stock: {
        units: counts.stock_units,
        valueAtPrice: round(counts.stock_value_price),
        valueAtCost: round(counts.stock_value_cost),
        outOfStock: counts.out_of_stock
      },
      auditSeries,
      auditsByAction,
      categories,
      fiscalByUf
    };
  }

  /* ─── Vendas (PDV) ─────────────────────────────────────────────────────── */

  private async salesKpis(companyId: string | null, from: string, to: string) {
    const params = this.params(companyId, from, to);
    const [totals] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS orders,
              COALESCE(SUM(s.total), 0)::float8 AS revenue,
              COALESCE(SUM(s.discount), 0)::float8 AS discount,
              COALESCE(SUM(s.items_count), 0)::int AS items
         FROM sales s
        WHERE ${COMPLETED_SALES}`,
      params
    );
    const [margin] = await this.dataSource.query(
      `SELECT COALESCE(SUM(i.total) FILTER (WHERE i.unit_cost IS NOT NULL), 0)::float8 AS revenue_with_cost,
              COALESCE(SUM(i.total - i.quantity * i.unit_cost)
                       FILTER (WHERE i.unit_cost IS NOT NULL), 0)::float8 AS gross_profit
         FROM sale_items i
         JOIN sales s ON s.id = i.sale_id
        WHERE ${COMPLETED_SALES}`,
      params
    );
    const [canceled] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(s.total), 0)::float8 AS value
         FROM sales s
        WHERE s.status = 'CANCELED' AND ${COMPANY('s')} AND ${PERIOD('s.created_at')}`,
      params
    );

    const revenue = round(totals.revenue);
    return {
      revenue,
      orders: totals.orders,
      averageTicket: totals.orders ? round(totals.revenue / totals.orders) : 0,
      itemsSold: totals.items,
      discount: round(totals.discount),
      grossProfit: round(margin.gross_profit),
      grossMarginPercent: margin.revenue_with_cost
        ? round((margin.gross_profit / margin.revenue_with_cost) * 100, 1)
        : null,
      canceledOrders: canceled.count,
      canceledValue: round(canceled.value)
    };
  }

  private async productSales(companyId: string | null, from: string, to: string) {
    const rows: ProductSalesRow[] = await this.dataSource.query(
      `SELECT COALESCE(i.product_id::text, i.product_name) AS key,
              (array_agg(i.product_id))[1]::text AS product_id,
              MAX(i.product_name) AS name,
              SUM(i.quantity)::int AS quantity,
              SUM(i.total)::float8 AS revenue,
              (SUM(i.total - i.quantity * i.unit_cost) FILTER (WHERE i.unit_cost IS NOT NULL))::float8 AS profit
         FROM sale_items i
         JOIN sales s ON s.id = i.sale_id
        WHERE ${COMPLETED_SALES}
        GROUP BY 1
        ORDER BY revenue DESC`,
      this.params(companyId, from, to)
    );
    return rows;
  }

  async sales(companyId: string | null, range: DateRange, forecastDays = 7) {
    const params = this.params(companyId, range.from, range.to);

    const [current, previous] = await Promise.all([
      this.salesKpis(companyId, range.from, range.to),
      this.salesKpis(companyId, range.previousFrom, range.previousTo)
    ]);

    const daily: { day: string; orders: number; revenue: number }[] = await this.dataSource.query(
      `WITH days AS (
         SELECT generate_series($2::date, $3::date, interval '1 day')::date AS day
       ),
       agg AS (
         SELECT (s.created_at AT TIME ZONE $4)::date AS day,
                COUNT(*)::int AS orders,
                SUM(s.total)::float8 AS revenue
           FROM sales s
          WHERE ${COMPLETED_SALES}
          GROUP BY 1
       )
       SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              COALESCE(agg.orders, 0) AS orders,
              COALESCE(agg.revenue, 0)::float8 AS revenue
         FROM days d
         LEFT JOIN agg ON agg.day = d.day
        ORDER BY d.day`,
      params
    );

    const byCategory = await this.dataSource.query(
      `SELECT COALESCE(i.category_name, 'Sem categoria') AS category,
              SUM(i.quantity)::int AS quantity,
              SUM(i.total)::float8 AS revenue
         FROM sale_items i
         JOIN sales s ON s.id = i.sale_id
        WHERE ${COMPLETED_SALES}
        GROUP BY 1
        ORDER BY revenue DESC`,
      params
    );

    const byPayment = await this.dataSource.query(
      `SELECT s.payment_method AS method,
              COUNT(*)::int AS orders,
              SUM(s.total)::float8 AS revenue
         FROM sales s
        WHERE ${COMPLETED_SALES}
        GROUP BY 1
        ORDER BY revenue DESC`,
      params
    );

    const byHour = await this.dataSource.query(
      `WITH hours AS (SELECT generate_series(0, 23) AS hour),
       agg AS (
         SELECT EXTRACT(HOUR FROM s.created_at AT TIME ZONE $4)::int AS hour,
                COUNT(*)::int AS orders,
                SUM(s.total)::float8 AS revenue
           FROM sales s
          WHERE ${COMPLETED_SALES}
          GROUP BY 1
       )
       SELECT h.hour, COALESCE(agg.orders, 0) AS orders, COALESCE(agg.revenue, 0)::float8 AS revenue
         FROM hours h
         LEFT JOIN agg ON agg.hour = h.hour
        ORDER BY h.hour`,
      params
    );

    const byWeekday = await this.dataSource.query(
      `WITH weekdays AS (SELECT generate_series(1, 7) AS weekday),
       agg AS (
         SELECT EXTRACT(ISODOW FROM s.created_at AT TIME ZONE $4)::int AS weekday,
                COUNT(*)::int AS orders,
                SUM(s.total)::float8 AS revenue
           FROM sales s
          WHERE ${COMPLETED_SALES}
          GROUP BY 1
       )
       SELECT w.weekday, COALESCE(agg.orders, 0) AS orders, COALESCE(agg.revenue, 0)::float8 AS revenue
         FROM weekdays w
         LEFT JOIN agg ON agg.weekday = w.weekday
        ORDER BY w.weekday`,
      params
    );

    const products = await this.productSales(companyId, range.from, range.to);

    // Curva ABC (Pareto): A = até 80% do faturamento acumulado, B = até 95%, C = restante.
    const totalRevenue = products.reduce((sum, row) => sum + row.revenue, 0);
    let cumulative = 0;
    const abc = products.map((row) => {
      const share = totalRevenue ? row.revenue / totalRevenue : 0;
      const startShare = cumulative;
      cumulative += share;
      const abcClass = startShare < 0.8 ? 'A' : startShare < 0.95 ? 'B' : 'C';
      return {
        productId: row.product_id,
        name: row.name,
        quantity: row.quantity,
        revenue: round(row.revenue),
        sharePercent: round(share * 100, 1),
        cumulativePercent: round(cumulative * 100, 1),
        class: abcClass
      };
    });
    const abcSummary = (['A', 'B', 'C'] as const).map((cls) => {
      const items = abc.filter((row) => row.class === cls);
      return {
        class: cls,
        products: items.length,
        revenue: round(items.reduce((sum, row) => sum + row.revenue, 0))
      };
    });

    // Tendência e previsão por regressão linear sobre o faturamento diário.
    const revenueSeries = daily.map((row) => Number(row.revenue));
    const model = forecastLinear(revenueSeries, forecastDays);
    const average7 = movingAverage(revenueSeries, 7);
    const enoughData = daily.length >= 7 && current.orders >= 3;

    return {
      period: {
        from: range.from,
        to: range.to,
        days: range.days,
        previousFrom: range.previousFrom,
        previousTo: range.previousTo
      },
      kpis: current,
      previousKpis: previous,
      variation: {
        revenue: variation(current.revenue, previous.revenue),
        orders: variation(current.orders, previous.orders),
        averageTicket: variation(current.averageTicket, previous.averageTicket),
        itemsSold: variation(current.itemsSold, previous.itemsSold)
      },
      daily: daily.map((row, index) => ({
        day: row.day,
        orders: Number(row.orders),
        revenue: round(Number(row.revenue)),
        movingAverage7: round(average7[index]),
        trend: round(model.fitted[index])
      })),
      forecast: {
        method: 'Regressão linear (mínimos quadrados) sobre o faturamento diário',
        reliable: enoughData,
        horizonDays: forecastDays,
        slopePerDay: round(model.slope),
        r2: round(model.r2, 3),
        direction: Math.abs(model.slope) < 0.01 ? 'estável' : model.slope > 0 ? 'alta' : 'queda',
        points: model.forecast.map((value, index) => ({
          day: addDays(range.to, index + 1),
          revenue: round(value)
        })),
        expectedRevenue: round(model.forecast.reduce((sum, value) => sum + value, 0))
      },
      topProducts: products.slice(0, 10).map((row) => ({
        productId: row.product_id,
        name: row.name,
        quantity: row.quantity,
        revenue: round(row.revenue),
        profit: row.profit === null ? null : round(row.profit)
      })),
      byCategory: byCategory.map((row: any) => ({ ...row, revenue: round(row.revenue) })),
      byPayment: byPayment.map((row: any) => ({ ...row, revenue: round(row.revenue) })),
      byHour: byHour.map((row: any) => ({ ...row, revenue: round(row.revenue) })),
      byWeekday: byWeekday.map((row: any) => ({ ...row, revenue: round(row.revenue) })),
      abc,
      abcSummary
    };
  }

  /* ─── Qualidade dos dados de cadastro ──────────────────────────────────── */

  private async loadProducts(companyId: string | null): Promise<ProductRecord[]> {
    const rows = await this.dataSource.query(
      `SELECT p.id, p.name, p.sku, p.ncm, p.cest, p.barcode, p.origin,
              p.price::float8 AS price, p.cost_price::float8 AS cost_price, p.stock,
              p.tax_type, p.tax_profile_id, p.image_url, c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${COMPANY('p')}
        ORDER BY p.name`,
      [companyId]
    );
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      ncm: row.ncm,
      cest: row.cest,
      barcode: row.barcode,
      origin: row.origin === null ? null : Number(row.origin),
      price: Number(row.price),
      costPrice: row.cost_price === null ? null : Number(row.cost_price),
      stock: Number(row.stock),
      taxType: row.tax_type,
      taxProfileId: row.tax_profile_id,
      imageUrl: row.image_url,
      categoryName: row.category_name
    }));
  }

  async dataQuality(companyId: string | null) {
    const products = await this.loadProducts(companyId);
    return analyzeDataQuality(products);
  }

  /* ─── Segmentação de produtos (k-means) ────────────────────────────────── */

  async segments(companyId: string | null, range: DateRange, k = 3) {
    const rows = await this.dataSource.query(
      `SELECT p.id, p.name, p.price::float8 AS price, p.cost_price::float8 AS cost_price, p.stock,
              c.name AS category_name,
              COALESCE(x.quantity, 0)::int AS quantity,
              COALESCE(x.revenue, 0)::float8 AS revenue
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN (
           SELECT i.product_id, SUM(i.quantity) AS quantity, SUM(i.total) AS revenue
             FROM sale_items i
             JOIN sales s ON s.id = i.sale_id
            WHERE ${COMPLETED_SALES}
            GROUP BY i.product_id
         ) x ON x.product_id = p.id
        WHERE ${COMPANY('p')}`,
      this.params(companyId, range.from, range.to)
    );

    const items = rows.map((row: any) => {
      const price = Number(row.price);
      const cost = row.cost_price === null ? null : Number(row.cost_price);
      return {
        id: row.id as string,
        name: row.name as string,
        category: (row.category_name as string | null) ?? null,
        price,
        cost,
        marginPercent: cost !== null && price > 0 ? ((price - cost) / price) * 100 : null,
        stock: Math.max(0, Number(row.stock)),
        quantity: Number(row.quantity),
        revenue: Number(row.revenue)
      };
    });

    const minProducts = 6;
    if (items.length < minProducts) {
      return {
        period: { from: range.from, to: range.to },
        method: 'k-means',
        available: false,
        message: `São necessários pelo menos ${minProducts} produtos cadastrados para segmentar.`,
        clusters: []
      };
    }

    // Preparação: imputação da margem ausente pela média e transformação log para reduzir assimetria.
    const knownMargins = items.filter((i: any) => i.marginPercent !== null).map((i: any) => i.marginPercent);
    const meanMargin = knownMargins.length
      ? knownMargins.reduce((a: number, b: number) => a + b, 0) / knownMargins.length
      : 0;
    const features = items.map((item: any) => [
      Math.log1p(item.quantity),
      item.marginPercent ?? meanMargin,
      Math.log1p(item.price),
      Math.log1p(item.stock)
    ]);
    const { data } = standardize(features);
    const clustersCount = Math.min(k, items.length);
    const result = kmeans(data, clustersCount, { seed: 42, nInit: 10 });

    const groups = Array.from({ length: clustersCount }, (_, cluster) => {
      const members = items.filter((_: unknown, index: number) => result.labels[index] === cluster);
      const avg = (fn: (m: any) => number) =>
        members.length ? members.reduce((sum: number, m: any) => sum + fn(m), 0) / members.length : 0;
      const dailySales = avg((m) => m.quantity) / range.days;
      return {
        cluster,
        size: members.length,
        avgQuantity: round(avg((m) => m.quantity), 1),
        avgRevenue: round(avg((m) => m.revenue)),
        avgPrice: round(avg((m) => m.price)),
        avgMarginPercent: round(avg((m) => m.marginPercent ?? meanMargin), 1),
        avgStock: round(avg((m) => m.stock), 1),
        coverageDays: dailySales > 0 ? round(avg((m) => m.stock) / dailySales, 0) : null,
        products: members
          .sort((a: any, b: any) => b.revenue - a.revenue)
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            category: m.category,
            quantity: m.quantity,
            revenue: round(m.revenue),
            stock: m.stock,
            marginPercent: m.marginPercent === null ? null : round(m.marginPercent, 1)
          }))
      };
    });

    // Nomeia os grupos pelo giro médio (quantidade vendida), do maior para o menor.
    const ordered = [...groups].sort((a, b) => b.avgQuantity - a.avgQuantity);
    const named = ordered.map((group, index) => {
      let label = 'Giro intermediário';
      let recommendation = 'Acompanhar a evolução e testar ações promocionais pontuais.';
      if (index === 0 && group.avgQuantity > 0) {
        label = 'Alto giro';
        recommendation =
          group.coverageDays !== null && group.coverageDays <= 15
            ? 'Risco de ruptura: priorizar a reposição desses itens.'
            : 'Manter a exposição e a reposição regular; são os itens que mais giram.';
      } else if (index === ordered.length - 1) {
        const stale = group.avgStock > 0 && (group.coverageDays === null || group.coverageDays > 60);
        label = stale ? 'Baixo giro / estoque parado' : 'Baixo giro';
        recommendation = stale
          ? 'Rever preço, criar promoções ou reduzir novas compras desses itens.'
          : 'Avaliar a permanência no mix e a exposição desses produtos.';
      }
      return { ...group, label, recommendation };
    });

    return {
      period: { from: range.from, to: range.to },
      method: 'k-means (k-means++, 10 inicializações) sobre variáveis padronizadas',
      features: [
        'quantidade vendida no período (log)',
        'margem bruta % (custo ausente imputado pela média)',
        'preço de venda (log)',
        'estoque atual (log)'
      ],
      available: true,
      inertia: round(result.inertia, 3),
      clusters: named
    };
  }
}
