'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import CompanyFilter from '../../../components/CompanyFilter';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useChartPalette } from '../../../lib/chart-palette';
import {
  buildQuery,
  daysAgo,
  formatCurrency,
  formatNumber,
  formatPercent,
  longDay,
  PAYMENT_LABELS,
  shortDay,
  toIsoDate,
  WEEKDAY_LABELS
} from '../../../lib/format';

/* ─── Tipos das respostas da API ───────────────────────────────────────── */

type Kpis = {
  revenue: number;
  orders: number;
  averageTicket: number;
  itemsSold: number;
  discount: number;
  grossProfit: number;
  grossMarginPercent: number | null;
  canceledOrders: number;
  canceledValue: number;
};

type SalesAnalytics = {
  period: { from: string; to: string; days: number; previousFrom: string; previousTo: string };
  kpis: Kpis;
  previousKpis: Kpis;
  variation: { revenue: number | null; orders: number | null; averageTicket: number | null; itemsSold: number | null };
  daily: { day: string; orders: number; revenue: number; movingAverage7: number; trend: number }[];
  forecast: {
    method: string;
    reliable: boolean;
    horizonDays: number;
    slopePerDay: number;
    r2: number;
    direction: string;
    points: { day: string; revenue: number }[];
    expectedRevenue: number;
  };
  topProducts: { productId: string | null; name: string; quantity: number; revenue: number; profit: number | null }[];
  byCategory: { category: string; quantity: number; revenue: number }[];
  byPayment: { method: string; orders: number; revenue: number }[];
  byHour: { hour: number; orders: number; revenue: number }[];
  byWeekday: { weekday: number; orders: number; revenue: number }[];
  abc: {
    productId: string | null;
    name: string;
    quantity: number;
    revenue: number;
    sharePercent: number;
    cumulativePercent: number;
    class: 'A' | 'B' | 'C';
  }[];
  abcSummary: { class: 'A' | 'B' | 'C'; products: number; revenue: number }[];
};

type Overview = {
  period: { from: string; to: string; days: number; granularity: 'day' | 'month' };
  counts: {
    products: number;
    categories: number;
    users: number;
    apiKeys: number;
    fiscalRules: number;
    icmsRates: number;
    companies: number;
    audits: number;
  };
  stock: { units: number; valueAtPrice: number; valueAtCost: number; outOfStock: number };
  auditSeries: { bucket: string; total: number; logins: number; products: number; sales: number; fiscal: number }[];
  auditsByAction: { action: string; count: number }[];
  categories: { name: string; products: number; stock: number }[];
  fiscalByUf: { uf: string; rules: number; simples: number; normal: number }[];
};

type DataQuality = {
  totalProducts: number;
  completenessScore: number;
  consistencyScore: number;
  productsWithErrors: number;
  productsWithWarnings: number;
  fields: { field: string; label: string; filled: number; total: number; percent: number }[];
  issuesByCode: { code: string; label: string; severity: 'error' | 'warning'; count: number }[];
  issues: { productId: string; productName: string; code: string; severity: 'error' | 'warning'; message: string }[];
};

type Segments = {
  available: boolean;
  message?: string;
  method: string;
  features?: string[];
  clusters: {
    cluster: number;
    label: string;
    recommendation: string;
    size: number;
    avgQuantity: number;
    avgRevenue: number;
    avgPrice: number;
    avgMarginPercent: number;
    avgStock: number;
    coverageDays: number | null;
    products: { id: string; name: string; quantity: number; revenue: number; stock: number }[];
  }[];
};

type Tab = 'vendas' | 'produtos' | 'qualidade' | 'operacao';

const TABS: { id: Tab; label: string }[] = [
  { id: 'vendas', label: 'Vendas' },
  { id: 'produtos', label: 'Produtos (ABC e segmentação)' },
  { id: 'qualidade', label: 'Qualidade dos dados' },
  { id: 'operacao', label: 'Operação e auditoria' }
];

const PRESETS = [7, 30, 90];

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  CREATE_PRODUCT: 'Produto criado',
  UPDATE_PRODUCT: 'Produto atualizado',
  DELETE_PRODUCT: 'Produto removido',
  CREATE_SALE: 'Venda registrada',
  CANCEL_SALE: 'Venda cancelada',
  CREATE_CATEGORY: 'Categoria criada',
  CREATE_USER: 'Usuário criado',
  UPDATE_USER: 'Usuário atualizado'
};

/* ─── Componentes auxiliares ───────────────────────────────────────────── */

function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: number | null; hint?: string }) {
  const hasDelta = delta !== undefined;
  const cls = delta === null || delta === undefined || delta === 0 ? 'neutral' : delta > 0 ? 'up' : 'down';
  const deltaText =
    delta === null
      ? 'sem base no período anterior'
      : delta === undefined
        ? ''
        : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} ${formatPercent(Math.abs(delta))} vs. período anterior`;
  return (
    <div className="an-kpi">
      <span className="an-kpi__label">{label}</span>
      <span className="an-kpi__value">{value}</span>
      {hasDelta ? <span className={`an-kpi__delta ${cls}`}>{deltaText}</span> : null}
      {hint ? <span className="an-kpi__label">{hint}</span> : null}
    </div>
  );
}

/**
 * Painel de gráfico com alternativa acessível: o mesmo conteúdo pode ser
 * exibido como tabela (útil para leitores de tela e para conferência dos números).
 */
function ChartPanel({
  title,
  subtitle,
  summary,
  table,
  wide,
  children
}: {
  title: string;
  subtitle?: string;
  summary: string;
  table?: { columns: string[]; rows: (string | number)[][]; numeric?: number[] };
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`an-panel${wide ? ' wide' : ''}`}>
      <div className="an-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {table ? (
          <button type="button" className="an-link" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? 'Ver gráfico' : 'Ver como tabela'}
          </button>
        ) : null}
      </div>
      {asTable && table ? (
        <div className="an-table-wrap">
          <table className="an-table">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                {table.columns.map((column, index) => (
                  <th key={column} className={table.numeric?.includes(index) ? 'num' : undefined}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td key={index} className={table.numeric?.includes(index) ? 'num' : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <figure role="img" aria-label={summary} style={{ margin: 0 }}>
          {children}
        </figure>
      )}
    </section>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--ink)'
};

/* ─── Página ───────────────────────────────────────────────────────────── */

export default function AnalisePage() {
  const { token, user } = useAuth();
  const palette = useChartPalette();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [tab, setTab] = useState<Tab>('vendas');
  const [preset, setPreset] = useState<number | null>(30);
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(toIsoDate(new Date()));
  const [companyId, setCompanyId] = useState('');

  const [sales, setSales] = useState<SalesAnalytics | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [quality, setQuality] = useState<DataQuality | null>(null);
  const [segments, setSegments] = useState<Segments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const applyPreset = (days: number) => {
    setPreset(days);
    setFrom(daysAgo(days - 1));
    setTo(toIsoDate(new Date()));
  };

  const load = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError('');
    const query = buildQuery({ from, to, companyId: isSuperAdmin ? companyId : null });
    const companyQuery = buildQuery({ companyId: isSuperAdmin ? companyId : null });
    try {
      const [salesData, overviewData, qualityData, segmentsData] = await Promise.all([
        apiRequest<SalesAnalytics>(`/analytics/sales${query}`, {}, token),
        apiRequest<Overview>(`/analytics/overview${query}`, {}, token),
        apiRequest<DataQuality>(`/analytics/data-quality${companyQuery}`, {}, token),
        apiRequest<Segments>(`/analytics/segments${query}`, {}, token)
      ]);
      setSales(salesData);
      setOverview(overviewData);
      setQuality(qualityData);
      setSegments(segmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a análise');
    } finally {
      setLoading(false);
    }
  }, [token, user, from, to, companyId, isSuperAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  /* Série diária + previsão no mesmo eixo (a previsão aparece tracejada). */
  const revenueChart = useMemo(() => {
    if (!sales) return [];
    const observed = sales.daily.map((d) => ({
      label: shortDay(d.day),
      faturamento: d.revenue,
      media7: d.movingAverage7,
      tendencia: d.trend,
      previsao: null as number | null
    }));
    if (observed.length) {
      observed[observed.length - 1].previsao = observed[observed.length - 1].tendencia;
    }
    const projected = sales.forecast.points.map((p) => ({
      label: shortDay(p.day),
      faturamento: null as unknown as number,
      media7: null as unknown as number,
      tendencia: null as unknown as number,
      previsao: p.revenue
    }));
    return [...observed, ...projected];
  }, [sales]);

  const exportExcel = () => {
    if (!sales) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        sales.daily.map((d) => ({ Dia: longDay(d.day), Pedidos: d.orders, Faturamento: d.revenue, 'Média móvel 7d': d.movingAverage7 }))
      ),
      'Vendas por dia'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        sales.abc.map((r) => ({
          Produto: r.name,
          Quantidade: r.quantity,
          Faturamento: r.revenue,
          'Participação %': r.sharePercent,
          'Acumulado %': r.cumulativePercent,
          Classe: r.class
        }))
      ),
      'Curva ABC'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(sales.byCategory.map((r) => ({ Categoria: r.category, Quantidade: r.quantity, Faturamento: r.revenue }))),
      'Por categoria'
    );
    if (quality) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          quality.issues.map((i) => ({ Produto: i.productName, Gravidade: i.severity === 'error' ? 'Erro' : 'Alerta', Problema: i.message }))
        ),
        'Qualidade dos dados'
      );
    }
    XLSX.writeFile(wb, `analise-vendas_${from}_${to}.xlsx`);
  };

  if (!user) return null;

  const axisTick = { fontSize: 11, fill: palette.axis };
  const k = sales?.kpis;

  return (
    <div className="an-page">
      <div className="an-header">
        <div>
          <h1>Análise de vendas</h1>
          <p>Dashboard analítico com indicadores, previsão, curva ABC, segmentação de produtos e qualidade dos dados.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/pdv" className="btn ghost">
            Abrir PDV
          </Link>
          <button type="button" className="btn" onClick={exportExcel} disabled={!sales}>
            Exportar Excel
          </button>
        </div>
      </div>

      <form
        className="an-filters"
        aria-label="Filtros da análise"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <div className="an-presets" role="group" aria-label="Períodos rápidos">
          {PRESETS.map((days) => (
            <button key={days} type="button" aria-pressed={preset === days} onClick={() => applyPreset(days)}>
              {days} dias
            </button>
          ))}
        </div>
        <label>
          De
          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) => {
              setPreset(null);
              setFrom(event.target.value);
            }}
          />
        </label>
        <label>
          Até
          <input
            type="date"
            value={to}
            min={from}
            onChange={(event) => {
              setPreset(null);
              setTo(event.target.value);
            }}
          />
        </label>
        {isSuperAdmin ? <CompanyFilter token={token} value={companyId} onChange={setCompanyId} /> : null}
      </form>

      {error ? (
        <div className="message error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="an-tabs" role="tablist" aria-label="Seções da análise">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && !sales ? <div className="an-empty">Carregando indicadores…</div> : null}

      {/* ── Vendas ─────────────────────────────────────────────────────── */}
      {tab === 'vendas' && sales && k ? (
        <div role="tabpanel" id="panel-vendas" aria-labelledby="tab-vendas" className="an-page">
          <div className="an-kpis">
            <Kpi label="Faturamento" value={formatCurrency(k.revenue)} delta={sales.variation.revenue} />
            <Kpi label="Pedidos" value={formatNumber(k.orders)} delta={sales.variation.orders} />
            <Kpi label="Ticket médio" value={formatCurrency(k.averageTicket)} delta={sales.variation.averageTicket} />
            <Kpi label="Itens vendidos" value={formatNumber(k.itemsSold)} delta={sales.variation.itemsSold} />
            <Kpi
              label="Margem bruta"
              value={k.grossMarginPercent === null ? '—' : formatPercent(k.grossMarginPercent)}
              hint={`Lucro bruto ${formatCurrency(k.grossProfit)} (itens com custo)`}
            />
            <Kpi
              label="Cancelamentos"
              value={formatNumber(k.canceledOrders)}
              hint={`${formatCurrency(k.canceledValue)} · descontos ${formatCurrency(k.discount)}`}
            />
          </div>

          {k.orders === 0 ? (
            <div className="an-panel">
              <div className="an-empty">
                Nenhuma venda no período selecionado. Registre vendas no <Link href="/pdv">PDV</Link> para alimentar os indicadores.
              </div>
            </div>
          ) : null}

          <div className="an-grid">
            <ChartPanel
              wide
              title="Faturamento diário, tendência e previsão"
              subtitle={`${longDay(sales.period.from)} a ${longDay(sales.period.to)} · previsão para ${sales.forecast.horizonDays} dias`}
              summary={`Faturamento de ${formatCurrency(k.revenue)} no período; tendência de ${sales.forecast.direction}, previsão de ${formatCurrency(sales.forecast.expectedRevenue)} para os próximos ${sales.forecast.horizonDays} dias.`}
              table={{
                columns: ['Dia', 'Pedidos', 'Faturamento', 'Média móvel 7d'],
                rows: [
                  ...sales.daily.map((d) => [longDay(d.day), d.orders, formatCurrency(d.revenue), formatCurrency(d.movingAverage7)]),
                  ...sales.forecast.points.map((p) => [`${longDay(p.day)} (previsão)`, '—', formatCurrency(p.revenue), '—'])
                ],
                numeric: [1, 2, 3]
              }}
            >
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={revenueChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} minTickGap={16} />
                  <YAxis tick={axisTick} tickFormatter={(v: number) => `R$ ${formatNumber(v)}`} width={80} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [value === null ? '—' : formatCurrency(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="faturamento" name="Faturamento" fill={palette.series[0]} radius={[4, 4, 0, 0]} isAnimationActive={palette.animate} />
                  <Line type="monotone" dataKey="media7" name="Média móvel 7 dias" stroke={palette.series[1]} strokeWidth={palette.strokeWidth} dot={palette.showDots} isAnimationActive={palette.animate} />
                  <Line type="linear" dataKey="tendencia" name="Tendência (regressão)" stroke={palette.series[3]} strokeWidth={palette.strokeWidth} dot={false} isAnimationActive={palette.animate} />
                  <Line type="linear" dataKey="previsao" name="Previsão" stroke={palette.series[2]} strokeDasharray={palette.forecastDash} strokeWidth={palette.strokeWidth} dot isAnimationActive={palette.animate} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="an-note">
                {sales.forecast.method}. Tendência de <strong>{sales.forecast.direction}</strong> ({formatCurrency(sales.forecast.slopePerDay)}/dia, R² ={' '}
                {sales.forecast.r2.toLocaleString('pt-BR')}).{' '}
                {sales.forecast.reliable
                  ? `Faturamento esperado para os próximos ${sales.forecast.horizonDays} dias: ${formatCurrency(sales.forecast.expectedRevenue)}.`
                  : 'Poucos dados no período: use a previsão apenas como referência.'}
              </p>
            </ChartPanel>

            <ChartPanel
              title="Produtos mais vendidos"
              subtitle="Top 10 por faturamento"
              summary={sales.topProducts.length ? `Produto líder: ${sales.topProducts[0].name} com ${formatCurrency(sales.topProducts[0].revenue)}.` : 'Sem vendas.'}
              table={{
                columns: ['Produto', 'Qtd.', 'Faturamento', 'Lucro bruto'],
                rows: sales.topProducts.map((p) => [p.name, p.quantity, formatCurrency(p.revenue), p.profit === null ? '—' : formatCurrency(p.profit)]),
                numeric: [1, 2, 3]
              }}
            >
              <ResponsiveContainer width="100%" height={Math.max(220, sales.topProducts.length * 30)}>
                <BarChart data={sales.topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} horizontal={false} />
                  <XAxis type="number" tick={axisTick} tickFormatter={(v: number) => formatNumber(v)} />
                  <YAxis type="category" dataKey="name" tick={axisTick} width={120} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Faturamento']} />
                  <Bar dataKey="revenue" name="Faturamento" fill={palette.series[0]} radius={[0, 4, 4, 0]} isAnimationActive={palette.animate} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="Faturamento por categoria"
              summary={sales.byCategory.map((c) => `${c.category}: ${formatCurrency(c.revenue)}`).join('; ') || 'Sem vendas.'}
              table={{
                columns: ['Categoria', 'Qtd.', 'Faturamento'],
                rows: sales.byCategory.map((c) => [c.category, c.quantity, formatCurrency(c.revenue)]),
                numeric: [1, 2]
              }}
            >
              {sales.byCategory.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={sales.byCategory}
                      dataKey="revenue"
                      nameKey="category"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke={palette.highContrast ? 'var(--ink)' : 'none'}
                      isAnimationActive={palette.animate}
                    >
                      {sales.byCategory.map((_, index) => (
                        <Cell key={index} fill={palette.series[index % palette.series.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="an-empty">Sem vendas no período.</div>
              )}
            </ChartPanel>

            <ChartPanel
              title="Formas de pagamento"
              summary={sales.byPayment.map((p) => `${PAYMENT_LABELS[p.method] || p.method}: ${p.orders} pedidos`).join('; ') || 'Sem vendas.'}
              table={{
                columns: ['Forma', 'Pedidos', 'Faturamento'],
                rows: sales.byPayment.map((p) => [PAYMENT_LABELS[p.method] || p.method, p.orders, formatCurrency(p.revenue)]),
                numeric: [1, 2]
              }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sales.byPayment.map((p) => ({ ...p, label: PAYMENT_LABELS[p.method] || p.method }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} interval={0} />
                  <YAxis tick={axisTick} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="orders" name="Pedidos" fill={palette.series[3]} radius={[4, 4, 0, 0]} isAnimationActive={palette.animate} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="Vendas por dia da semana"
              summary={sales.byWeekday.map((w) => `${WEEKDAY_LABELS[w.weekday - 1]}: ${w.orders} pedidos`).join('; ')}
              table={{
                columns: ['Dia', 'Pedidos', 'Faturamento'],
                rows: sales.byWeekday.map((w) => [WEEKDAY_LABELS[w.weekday - 1], w.orders, formatCurrency(w.revenue)]),
                numeric: [1, 2]
              }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sales.byWeekday.map((w) => ({ ...w, label: WEEKDAY_LABELS[w.weekday - 1] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} />
                  <YAxis tick={axisTick} tickFormatter={(v: number) => formatNumber(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Faturamento']} />
                  <Bar dataKey="revenue" name="Faturamento" fill={palette.series[1]} radius={[4, 4, 0, 0]} isAnimationActive={palette.animate} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="Vendas por horário"
              summary="Quantidade de pedidos por hora do dia."
              table={{
                columns: ['Hora', 'Pedidos', 'Faturamento'],
                rows: sales.byHour.filter((h) => h.orders > 0).map((h) => [`${h.hour}h`, h.orders, formatCurrency(h.revenue)]),
                numeric: [1, 2]
              }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sales.byHour.map((h) => ({ ...h, label: `${h.hour}h` }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} interval={2} />
                  <YAxis tick={axisTick} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="orders" name="Pedidos" fill={palette.series[4]} radius={[4, 4, 0, 0]} isAnimationActive={palette.animate} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </div>
      ) : null}

      {/* ── Produtos: curva ABC e segmentação ─────────────────────────── */}
      {tab === 'produtos' && sales ? (
        <div role="tabpanel" id="panel-produtos" aria-labelledby="tab-produtos" className="an-page">
          <div className="an-kpis">
            {sales.abcSummary.map((s) => (
              <Kpi
                key={s.class}
                label={`Classe ${s.class} ${s.class === 'A' ? '(até 80% do faturamento)' : s.class === 'B' ? '(80% a 95%)' : '(últimos 5%)'}`}
                value={`${s.products} produto${s.products === 1 ? '' : 's'}`}
                hint={formatCurrency(s.revenue)}
              />
            ))}
          </div>

          <section className="an-panel">
            <div className="an-panel-head">
              <div>
                <h2>Curva ABC (Pareto)</h2>
                <p>Classificação dos produtos vendidos pela participação acumulada no faturamento.</p>
              </div>
            </div>
            {sales.abc.length ? (
              <div className="an-table-wrap">
                <table className="an-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th className="num">Qtd.</th>
                      <th className="num">Faturamento</th>
                      <th className="num">Participação</th>
                      <th className="num">Acumulado</th>
                      <th>Classe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.abc.map((row) => (
                      <tr key={row.productId || row.name}>
                        <td>{row.name}</td>
                        <td className="num">{formatNumber(row.quantity)}</td>
                        <td className="num">{formatCurrency(row.revenue)}</td>
                        <td className="num">{formatPercent(row.sharePercent)}</td>
                        <td className="num">{formatPercent(row.cumulativePercent)}</td>
                        <td>
                          <span className={`an-badge ${row.class}`}>{row.class}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="an-empty">Sem vendas no período.</div>
            )}
          </section>

          <section className="an-panel">
            <div className="an-panel-head">
              <div>
                <h2>Segmentação de produtos (aprendizagem não supervisionada)</h2>
                <p>{segments?.method}</p>
              </div>
            </div>
            {segments?.available ? (
              <>
                <div className="an-grid">
                  {segments.clusters.map((cluster) => (
                    <div key={cluster.cluster} className="an-cluster">
                      <strong style={{ fontSize: 15, color: 'var(--ink)' }}>
                        {cluster.label} · {cluster.size} produto{cluster.size === 1 ? '' : 's'}
                      </strong>
                      <span className="an-kpi__label">
                        Média de {formatNumber(cluster.avgQuantity)} un. vendidas · margem {formatPercent(cluster.avgMarginPercent)} · preço{' '}
                        {formatCurrency(cluster.avgPrice)} · estoque {formatNumber(cluster.avgStock)}
                        {cluster.coverageDays !== null ? ` · cobertura ≈ ${cluster.coverageDays} dias` : ''}
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{cluster.recommendation}</span>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--muted)' }}>
                        {cluster.products.slice(0, 8).map((p) => (
                          <li key={p.id}>
                            {p.name} — {formatNumber(p.quantity)} un. · estoque {formatNumber(p.stock)}
                          </li>
                        ))}
                        {cluster.products.length > 8 ? <li>e mais {cluster.products.length - 8}…</li> : null}
                      </ul>
                    </div>
                  ))}
                </div>
                {segments.features ? <p className="an-note">Variáveis usadas: {segments.features.join('; ')}.</p> : null}
              </>
            ) : (
              <div className="an-empty">{segments?.message || 'Segmentação indisponível.'}</div>
            )}
          </section>
        </div>
      ) : null}

      {/* ── Qualidade dos dados ───────────────────────────────────────── */}
      {tab === 'qualidade' && quality ? (
        <div role="tabpanel" id="panel-qualidade" aria-labelledby="tab-qualidade" className="an-page">
          <div className="an-kpis">
            <Kpi label="Produtos avaliados" value={formatNumber(quality.totalProducts)} />
            <Kpi label="Completude dos cadastros" value={formatPercent(quality.completenessScore)} hint="Média de preenchimento dos atributos" />
            <Kpi label="Consistência" value={formatPercent(quality.consistencyScore)} hint="Produtos sem erros" />
            <Kpi label="Produtos com erros" value={formatNumber(quality.productsWithErrors)} hint={`${quality.productsWithWarnings} com alertas`} />
          </div>

          <div className="an-grid">
            <section className="an-panel">
              <div className="an-panel-head">
                <div>
                  <h2>Preenchimento por atributo</h2>
                  <p>Percentual de produtos com o campo informado.</p>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {quality.fields.map((field) => (
                  <div key={field.field}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink)', marginBottom: 4 }}>
                      <span>{field.label}</span>
                      <span>
                        {field.filled}/{field.total} ({formatPercent(field.percent)})
                      </span>
                    </div>
                    <div
                      className="an-progress"
                      role="progressbar"
                      aria-label={field.label}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={field.percent}
                    >
                      <span style={{ width: `${field.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="an-panel">
              <div className="an-panel-head">
                <div>
                  <h2>Problemas encontrados</h2>
                  <p>Agrupados por tipo.</p>
                </div>
              </div>
              {quality.issuesByCode.length ? (
                <table className="an-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Gravidade</th>
                      <th className="num">Ocorrências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quality.issuesByCode.map((issue) => (
                      <tr key={issue.code}>
                        <td>{issue.label}</td>
                        <td>
                          <span className={`an-badge ${issue.severity}`}>{issue.severity === 'error' ? 'Erro' : 'Alerta'}</span>
                        </td>
                        <td className="num">{issue.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="an-empty">Nenhum problema encontrado nos cadastros.</div>
              )}
            </section>
          </div>

          {quality.issues.length ? (
            <section className="an-panel">
              <div className="an-panel-head">
                <div>
                  <h2>Detalhamento por produto</h2>
                  <p>Corrija os erros no cadastro para melhorar a qualidade das análises.</p>
                </div>
              </div>
              <div className="an-table-wrap">
                <table className="an-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Gravidade</th>
                      <th>Problema</th>
                      <th>
                        <span className="sr-only">Ação</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quality.issues.slice(0, 100).map((issue, index) => (
                      <tr key={`${issue.productId}-${issue.code}-${index}`}>
                        <td>{issue.productName}</td>
                        <td>
                          <span className={`an-badge ${issue.severity}`}>{issue.severity === 'error' ? 'Erro' : 'Alerta'}</span>
                        </td>
                        <td>{issue.message}</td>
                        <td>
                          <Link href={`/produtos/${issue.productId}`} className="an-link">
                            Editar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {quality.issues.length > 100 ? <p className="an-note">Exibindo 100 de {quality.issues.length} ocorrências. Use “Exportar Excel” para a lista completa.</p> : null}
            </section>
          ) : null}
        </div>
      ) : null}

      {/* ── Operação e auditoria ──────────────────────────────────────── */}
      {tab === 'operacao' && overview ? (
        <div role="tabpanel" id="panel-operacao" aria-labelledby="tab-operacao" className="an-page">
          <div className="an-kpis">
            <Kpi label="Produtos" value={formatNumber(overview.counts.products)} hint={`${overview.counts.categories} categorias`} />
            <Kpi label="Itens em estoque" value={formatNumber(overview.stock.units)} hint={`${overview.stock.outOfStock} produto(s) sem estoque`} />
            <Kpi label="Estoque a preço de venda" value={formatCurrency(overview.stock.valueAtPrice)} hint={`A custo: ${formatCurrency(overview.stock.valueAtCost)}`} />
            <Kpi label="Regras fiscais" value={formatNumber(overview.counts.fiscalRules)} hint={`${overview.counts.icmsRates} alíquotas de ICMS`} />
            <Kpi label="Eventos de auditoria" value={formatNumber(overview.counts.audits)} hint="No período filtrado" />
            {isSuperAdmin ? <Kpi label="Empresas" value={formatNumber(overview.counts.companies)} hint={`${overview.counts.users} usuários`} /> : null}
          </div>

          <div className="an-grid">
            <ChartPanel
              wide
              title="Atividade registrada na auditoria"
              subtitle={overview.period.granularity === 'month' ? 'Eventos por mês' : 'Eventos por dia'}
              summary={`${overview.counts.audits} eventos de auditoria no período.`}
              table={{
                columns: ['Período', 'Total', 'Logins', 'Produtos', 'Vendas', 'Fiscal'],
                rows: overview.auditSeries.map((r) => [longDay(r.bucket), r.total, r.logins, r.products, r.sales, r.fiscal]),
                numeric: [1, 2, 3, 4, 5]
              }}
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={overview.auditSeries.map((r) => ({
                    ...r,
                    label: overview.period.granularity === 'month' ? r.bucket.slice(5, 7) + '/' + r.bucket.slice(0, 4) : shortDay(r.bucket)
                  }))}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} minTickGap={16} />
                  <YAxis tick={axisTick} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" name="Total" stroke={palette.series[0]} strokeWidth={palette.strokeWidth} dot={palette.showDots} isAnimationActive={palette.animate} />
                  <Line type="monotone" dataKey="logins" name="Logins" stroke={palette.series[1]} strokeWidth={palette.strokeWidth} dot={palette.showDots} strokeDasharray={palette.highContrast ? '4 3' : undefined} isAnimationActive={palette.animate} />
                  <Line type="monotone" dataKey="products" name="Produtos" stroke={palette.series[2]} strokeWidth={palette.strokeWidth} dot={palette.showDots} strokeDasharray={palette.highContrast ? '1 3' : undefined} isAnimationActive={palette.animate} />
                  <Line type="monotone" dataKey="sales" name="Vendas" stroke={palette.series[3]} strokeWidth={palette.strokeWidth} dot={palette.showDots} isAnimationActive={palette.animate} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="Ações mais frequentes"
              summary={overview.auditsByAction.map((a) => `${ACTION_LABELS[a.action] || a.action}: ${a.count}`).join('; ') || 'Sem eventos.'}
              table={{
                columns: ['Ação', 'Ocorrências'],
                rows: overview.auditsByAction.map((a) => [ACTION_LABELS[a.action] || a.action, a.count]),
                numeric: [1]
              }}
            >
              <ResponsiveContainer width="100%" height={Math.max(200, overview.auditsByAction.length * 28)}>
                <BarChart
                  data={overview.auditsByAction.map((a) => ({ ...a, label: ACTION_LABELS[a.action] || a.action }))}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} horizontal={false} />
                  <XAxis type="number" tick={axisTick} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={axisTick} width={130} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Ocorrências" fill={palette.series[0]} radius={[0, 4, 4, 0]} isAnimationActive={palette.animate} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="Regras fiscais por UF"
              subtitle="Por regime tributário"
              summary={overview.fiscalByUf.map((u) => `${u.uf}: ${u.rules} regras`).join('; ') || 'Nenhuma regra fiscal cadastrada.'}
              table={{
                columns: ['UF', 'Simples Nacional', 'Regime normal', 'Total'],
                rows: overview.fiscalByUf.map((u) => [u.uf, u.simples, u.normal, u.rules]),
                numeric: [1, 2, 3]
              }}
            >
              {overview.fiscalByUf.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.fiscalByUf}>
                    <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                    <XAxis dataKey="uf" tick={axisTick} />
                    <YAxis tick={axisTick} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="simples" name="Simples Nacional" stackId="r" fill={palette.series[0]} isAnimationActive={palette.animate} />
                    <Bar dataKey="normal" name="Regime normal" stackId="r" fill={palette.series[2]} isAnimationActive={palette.animate} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="an-empty">Nenhuma regra fiscal cadastrada.</div>
              )}
            </ChartPanel>

            <ChartPanel
              title="Produtos e estoque por categoria"
              summary={overview.categories.map((c) => `${c.name}: ${c.products} produtos`).join('; ') || 'Sem categorias.'}
              table={{
                columns: ['Categoria', 'Produtos', 'Estoque (un.)'],
                rows: overview.categories.map((c) => [c.name, c.products, c.stock]),
                numeric: [1, 2]
              }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={overview.categories}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="name" tick={axisTick} interval={0} />
                  <YAxis yAxisId="left" tick={axisTick} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={axisTick} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="products" name="Produtos" fill={palette.series[0]} radius={[4, 4, 0, 0]} isAnimationActive={palette.animate} />
                  <Area yAxisId="right" type="monotone" dataKey="stock" name="Estoque" stroke={palette.series[1]} fill={palette.series[1]} fillOpacity={0.15} strokeWidth={palette.strokeWidth} isAnimationActive={palette.animate} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
