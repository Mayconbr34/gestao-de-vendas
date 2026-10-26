/**
 * Verificação de qualidade dos dados de cadastro de produtos.
 * Identifica lacunas (campos não preenchidos) e inconsistências (valores inválidos,
 * duplicados ou incoerentes) antes de os dados serem usados nas análises.
 */

export type ProductRecord = {
  id: string;
  name: string;
  sku: string | null;
  ncm: string | null;
  cest: string | null;
  barcode: string | null;
  origin: number | null;
  price: number;
  costPrice: number | null;
  stock: number;
  taxType: string | null;
  taxProfileId: string | null;
  imageUrl: string | null;
  categoryName: string | null;
};

export type IssueSeverity = 'error' | 'warning';

export type DataIssue = {
  productId: string;
  productName: string;
  code: string;
  severity: IssueSeverity;
  message: string;
};

export type FieldCompleteness = {
  field: string;
  label: string;
  filled: number;
  total: number;
  percent: number;
};

export type DataQualityReport = {
  totalProducts: number;
  /** Percentual médio de preenchimento dos atributos avaliados. */
  completenessScore: number;
  /** Percentual de produtos sem nenhum problema do tipo "error". */
  consistencyScore: number;
  productsWithErrors: number;
  productsWithWarnings: number;
  fields: FieldCompleteness[];
  issuesByCode: { code: string; label: string; severity: IssueSeverity; count: number }[];
  issues: DataIssue[];
};

const ISSUE_LABELS: Record<string, { label: string; severity: IssueSeverity }> = {
  NCM_MISSING: { label: 'NCM não informado', severity: 'error' },
  NCM_INVALID: { label: 'NCM com formato inválido', severity: 'error' },
  CEST_INVALID: { label: 'CEST com formato inválido', severity: 'error' },
  CEST_REQUIRED_ST: { label: 'CEST obrigatório para ICMS-ST', severity: 'error' },
  BARCODE_INVALID: { label: 'Código de barras (GTIN) inválido', severity: 'error' },
  BARCODE_DUPLICATED: { label: 'Código de barras duplicado', severity: 'error' },
  SKU_DUPLICATED: { label: 'SKU duplicado', severity: 'error' },
  PRICE_ZERO: { label: 'Preço de venda zerado', severity: 'error' },
  NEGATIVE_MARGIN: { label: 'Preço de venda menor ou igual ao custo', severity: 'error' },
  NEGATIVE_STOCK: { label: 'Estoque negativo', severity: 'error' },
  COST_MISSING: { label: 'Preço de custo não informado', severity: 'warning' },
  BARCODE_MISSING: { label: 'Código de barras não informado', severity: 'warning' },
  SKU_MISSING: { label: 'SKU não informado', severity: 'warning' },
  ORIGIN_MISSING: { label: 'Origem da mercadoria não informada', severity: 'warning' },
  TAX_MISSING: { label: 'Tributação não configurada', severity: 'warning' },
  OUT_OF_STOCK: { label: 'Produto sem estoque', severity: 'warning' },
  IMAGE_MISSING: { label: 'Produto sem imagem', severity: 'warning' }
};

const FIELDS: { field: keyof ProductRecord; label: string }[] = [
  { field: 'sku', label: 'SKU' },
  { field: 'ncm', label: 'NCM' },
  { field: 'cest', label: 'CEST' },
  { field: 'barcode', label: 'Código de barras' },
  { field: 'origin', label: 'Origem' },
  { field: 'costPrice', label: 'Preço de custo' },
  { field: 'taxType', label: 'Tributação' },
  { field: 'categoryName', label: 'Categoria' },
  { field: 'imageUrl', label: 'Imagem' }
];

function isFilled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/** Valida GTIN-8/12/13/14 (EAN/UPC) pelo dígito verificador. */
export function isValidGtin(code: string) {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop() as number;
  const sum = digits
    .reverse()
    .reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function countValues(values: (string | null)[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value?.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function analyzeDataQuality(products: ProductRecord[]): DataQualityReport {
  const issues: DataIssue[] = [];
  const skuCounts = countValues(products.map((p) => p.sku));
  const barcodeCounts = countValues(products.map((p) => p.barcode));

  const add = (product: ProductRecord, code: string, detail?: string) => {
    const meta = ISSUE_LABELS[code];
    issues.push({
      productId: product.id,
      productName: product.name,
      code,
      severity: meta.severity,
      message: detail ? `${meta.label}: ${detail}` : meta.label
    });
  };

  for (const product of products) {
    const ncm = product.ncm?.trim() ?? '';
    const cest = product.cest?.trim() ?? '';
    const barcode = product.barcode?.trim() ?? '';
    const sku = product.sku?.trim() ?? '';

    if (!ncm) add(product, 'NCM_MISSING');
    else if (!/^\d{8}$/.test(ncm)) add(product, 'NCM_INVALID', ncm);

    if (cest && !/^\d{7}$/.test(cest)) add(product, 'CEST_INVALID', cest);
    if (!cest && product.taxType === 'ICMS_ST') add(product, 'CEST_REQUIRED_ST');

    if (!barcode) add(product, 'BARCODE_MISSING');
    else {
      if (!isValidGtin(barcode)) add(product, 'BARCODE_INVALID', barcode);
      if ((barcodeCounts.get(barcode) ?? 0) > 1) add(product, 'BARCODE_DUPLICATED', barcode);
    }

    if (!sku) add(product, 'SKU_MISSING');
    else if ((skuCounts.get(sku) ?? 0) > 1) add(product, 'SKU_DUPLICATED', sku);

    if (product.origin === null || product.origin === undefined) add(product, 'ORIGIN_MISSING');
    if (!product.taxType && !product.taxProfileId) add(product, 'TAX_MISSING');
    if (!isFilled(product.imageUrl)) add(product, 'IMAGE_MISSING');

    if (!(product.price > 0)) add(product, 'PRICE_ZERO');
    if (product.costPrice === null || product.costPrice === undefined) add(product, 'COST_MISSING');
    else if (product.price > 0 && product.price <= product.costPrice) {
      add(
        product,
        'NEGATIVE_MARGIN',
        `venda R$ ${product.price.toFixed(2)} x custo R$ ${product.costPrice.toFixed(2)}`
      );
    }

    if (product.stock < 0) add(product, 'NEGATIVE_STOCK', String(product.stock));
    else if (product.stock === 0) add(product, 'OUT_OF_STOCK');
  }

  const total = products.length;
  const fields: FieldCompleteness[] = FIELDS.map(({ field, label }) => {
    const filled = products.filter((p) => isFilled(p[field])).length;
    return {
      field,
      label,
      filled,
      total,
      percent: total ? Math.round((filled / total) * 1000) / 10 : 0
    };
  });

  const errorProducts = new Set(issues.filter((i) => i.severity === 'error').map((i) => i.productId));
  const warningProducts = new Set(
    issues.filter((i) => i.severity === 'warning').map((i) => i.productId)
  );

  const byCode = new Map<string, number>();
  for (const issue of issues) byCode.set(issue.code, (byCode.get(issue.code) ?? 0) + 1);

  const completenessScore = fields.length
    ? Math.round((fields.reduce((sum, f) => sum + f.percent, 0) / fields.length) * 10) / 10
    : 0;
  const consistencyScore = total
    ? Math.round(((total - errorProducts.size) / total) * 1000) / 10
    : 100;

  return {
    totalProducts: total,
    completenessScore,
    consistencyScore,
    productsWithErrors: errorProducts.size,
    productsWithWarnings: warningProducts.size,
    fields,
    issuesByCode: Array.from(byCode.entries())
      .map(([code, count]) => ({
        code,
        label: ISSUE_LABELS[code].label,
        severity: ISSUE_LABELS[code].severity,
        count
      }))
      .sort((a, b) =>
        a.severity === b.severity ? b.count - a.count : a.severity === 'error' ? -1 : 1
      ),
    issues: issues.sort((a, b) =>
      a.severity === b.severity
        ? a.productName.localeCompare(b.productName, 'pt-BR')
        : a.severity === 'error'
          ? -1
          : 1
    )
  };
}
