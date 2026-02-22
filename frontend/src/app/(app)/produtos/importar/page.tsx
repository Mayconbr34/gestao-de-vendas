'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { apiRequest } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';

type Category = {
  id: string;
  name: string;
};

type ImportItem = {
  id: string;
  include: boolean;
  name: string;
  sku: string;
  ncm: string;
  cest: string;
  taxType: string;
  origin: string;
  salePrice: string;
  costPrice: string;
  profitPercent: string;
  stock: string;
  barcode: string;
  categoryId?: string;
  source?: string;
};

const ORIGIN_OPTIONS = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira (importação direta)' },
  { value: '2', label: '2 - Estrangeira (mercado interno)' },
  { value: '3', label: '3 - Nacional (conteúdo importado > 40%)' },
  { value: '4', label: '4 - Nacional (processo produtivo básico)' },
  { value: '5', label: '5 - Nacional (conteúdo importado <= 40%)' },
  { value: '6', label: '6 - Estrangeira (sem similar nacional)' },
  { value: '7', label: '7 - Estrangeira (mercado interno s/ similar)' },
  { value: '8', label: '8 - Nacional (conteúdo importado > 70%)' }
];

const TAX_TYPE_OPTIONS = [
  { value: 'TRIBUTADO', label: 'Tributado' },
  { value: 'ICMS_ST', label: 'ICMS-ST' },
  { value: 'ISENTO', label: 'Isento' }
];

const STEPS = [
  { n: 1, label: 'Arquivo', desc: 'Selecione a origem' },
  { n: 2, label: 'Revisão', desc: 'Ajuste os itens' },
  { n: 3, label: 'Importar', desc: 'Finalizar' }
];

const Ic = {
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

function tokens() {
  return {
    bg: 'var(--bg)',
    surface: 'var(--card)',
    surfaceHover: 'var(--sidebar-hover)',
    border: 'var(--border)',
    borderFocus: 'var(--accent)',
    text: 'var(--ink)',
    textSub: 'var(--muted)',
    textMuted: 'var(--muted)',
    accent: 'var(--accent)',
    accentBg: 'var(--sidebar-active-bg)',
    accentText: 'var(--accent-dark)',
    success: '#16a34a',
    successBg: 'rgba(22, 163, 74, 0.12)',
    successBorder: 'rgba(22, 163, 74, 0.28)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.12)',
    errorBorder: 'rgba(239, 68, 68, 0.28)',
    inputBg: 'var(--card)',
    inputBorder: 'var(--border)',
    inputMuted: 'var(--surface)',
    shadow: 'var(--shadow)',
    stepDone: '#16a34a',
    stepActive: 'var(--accent)',
    stepInactive: 'var(--border)',
    chipBg: 'var(--surface)',
    disabledBg: 'var(--surface)',
  };
}

function Field({
  label,
  children,
  hint,
  tk,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  tk: ReturnType<typeof tokens>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12.5px', fontWeight: '500', color: tk.textSub, fontFamily: 'var(--np-font)' }}>
        {label}
      </label>
      {children}
      {hint ? (
        <span style={{ fontSize: '11.5px', color: tk.textMuted, fontFamily: 'var(--np-font)' }}>{hint}</span>
      ) : null}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  tk,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
  tk: ReturnType<typeof tokens>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '10px 13px',
        background: tk.inputBg,
        border: `1px solid ${focused ? tk.borderFocus : tk.inputBorder}`,
        borderRadius: '8px',
        fontSize: '13.5px',
        color: value ? tk.text : tk.textMuted,
        fontFamily: 'var(--np-font)',
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

const normalize = (value: string) =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(',', '.').trim();
  return str ? String(Number(str)) : '';
};

const toNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '';
  return value.toFixed(2);
};

const calcProfitPercent = (sale: number | null, cost: number | null) => {
  if (cost === null || cost <= 0 || sale === null) return null;
  return ((sale - cost) / cost) * 100;
};

const calcSaleFromProfit = (cost: number | null, profit: number | null) => {
  if (cost === null || profit === null) return null;
  return cost * (1 + profit / 100);
};

const calcCostFromProfit = (sale: number | null, profit: number | null) => {
  if (sale === null || profit === null) return null;
  const denom = 1 + profit / 100;
  if (denom <= 0) return null;
  return sale / denom;
};

const normalizePricing = (item: ImportItem) => {
  const cost = toNumber(item.costPrice);
  const sale = toNumber(item.salePrice);
  const profit = toNumber(item.profitPercent);
  if (cost !== null && sale !== null) {
    const pct = calcProfitPercent(sale, cost);
    return { ...item, profitPercent: pct === null ? '' : formatNumber(pct) };
  }
  if (cost !== null && profit !== null) {
    const computedSale = calcSaleFromProfit(cost, profit);
    return { ...item, salePrice: formatNumber(computedSale) };
  }
  if (sale !== null && profit !== null) {
    const computedCost = calcCostFromProfit(sale, profit);
    return { ...item, costPrice: formatNumber(computedCost) };
  }
  return item;
};

const updatePricingField = (item: ImportItem, field: 'salePrice' | 'costPrice' | 'profitPercent', value: string) => {
  const next: ImportItem = { ...item, [field]: value };
  const cost = toNumber(next.costPrice);
  const sale = toNumber(next.salePrice);
  const profit = toNumber(next.profitPercent);

  if (field === 'costPrice') {
    if (sale !== null && cost !== null) {
      const pct = calcProfitPercent(sale, cost);
      next.profitPercent = pct === null ? '' : formatNumber(pct);
    } else if (profit !== null && cost !== null) {
      const computedSale = calcSaleFromProfit(cost, profit);
      next.salePrice = formatNumber(computedSale);
    }
  }

  if (field === 'salePrice') {
    if (cost !== null && sale !== null) {
      const pct = calcProfitPercent(sale, cost);
      next.profitPercent = pct === null ? '' : formatNumber(pct);
    } else if (profit !== null && sale !== null) {
      const computedCost = calcCostFromProfit(sale, profit);
      next.costPrice = formatNumber(computedCost);
    }
  }

  if (field === 'profitPercent') {
    if (cost !== null && profit !== null) {
      const computedSale = calcSaleFromProfit(cost, profit);
      next.salePrice = formatNumber(computedSale);
    } else if (sale !== null && profit !== null) {
      const computedCost = calcCostFromProfit(sale, profit);
      next.costPrice = formatNumber(computedCost);
    }
  }

  return next;
};

const getText = (parent: Element, tag: string) => {
  const direct = parent.getElementsByTagName(tag);
  if (direct.length) return direct[0].textContent?.trim() || '';
  const ns = parent.getElementsByTagNameNS('*', tag);
  if (ns.length) return ns[0].textContent?.trim() || '';
  return '';
};

export default function ImportarProdutosPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [fileType, setFileType] = useState<'excel' | 'xml'>('excel');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [defaultCategoryName, setDefaultCategoryName] = useState('');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [applyDefaultToAll, setApplyDefaultToAll] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const tk = tokens();
  const step = importing ? 3 : items.length > 0 ? 2 : 1;

  const loadCategories = async () => {
    if (!token) return;
    const data = await apiRequest<Category[]>('/categories', {}, token);
    setCategories(data);
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!applyDefaultToAll || !defaultCategoryId) return;
    setItems((current) =>
      current.map((item) => ({
        ...item,
        categoryId: defaultCategoryId
      }))
    );
  }, [defaultCategoryId, applyDefaultToAll]);

  const filteredCategories = useMemo(() => {
    if (!defaultCategoryName.trim()) return categories;
    const query = defaultCategoryName.trim().toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categories, defaultCategoryName]);

  const parseExcel = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    const mapped = rows.map((row, index) => {
      const normalized: Record<string, any> = {};
      Object.keys(row).forEach((key) => {
        normalized[normalize(key)] = row[key];
      });

      const pick = (keys: string[]) => {
        for (const key of keys) {
          if (normalized[key] !== undefined) return normalized[key];
        }
        return '';
      };

      const name = pick(['nome', 'produto', 'xprod', 'descricao']);
      const sku = pick(['sku', 'codigointerno', 'codigo', 'cod', 'cprod']);
      const ncm = pick(['ncm']);
      const cest = pick(['cest']);
      const origin = pick(['origem', 'origin']);
      const salePrice = pick(['precovenda', 'preco', 'valor', 'valorunitario', 'vuncom', 'precounitario', 'venda']);
      const costPrice = pick(['precoentrada', 'precocusto', 'custo', 'custounitario', 'valorcusto', 'valorentrada', 'entrada']);
      const profitPercent = pick(['lucro', 'margem', 'margemlucro', 'markup']);
      const stock = pick(['estoque', 'quantidade', 'qtd']);
      const barcode = pick(['barcode', 'barras', 'cean', 'codean']);

      const baseItem = {
        id: `excel-${index}`,
        include: true,
        name: String(name || '').trim(),
        sku: String(sku || '').trim(),
        ncm: String(ncm || '').trim(),
        cest: String(cest || '').trim(),
        taxType: 'TRIBUTADO',
        origin: String(origin || '').trim(),
        salePrice: parseNumber(salePrice),
        costPrice: parseNumber(costPrice),
        profitPercent: parseNumber(profitPercent),
        stock: parseNumber(stock),
        barcode: String(barcode || '').trim(),
        categoryId: defaultCategoryId || undefined,
        source: 'Excel'
      } as ImportItem;

      return normalizePricing(baseItem);
    });

    setItems(mapped);
  };

  const parseXml = async (file: File) => {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      throw new Error('XML inválido.');
    }
    const detNodes = doc.getElementsByTagName('det').length
      ? Array.from(doc.getElementsByTagName('det'))
      : Array.from(doc.getElementsByTagNameNS('*', 'det'));

    const mapped = detNodes.map((det, index) => {
      const prod = det.getElementsByTagName('prod')[0] || det.getElementsByTagNameNS('*', 'prod')[0];
      if (!prod) {
        return {
          id: `xml-${index}`,
          include: false,
          name: '',
          sku: '',
          ncm: '',
          cest: '',
          taxType: 'TRIBUTADO',
          origin: '',
          salePrice: '',
          costPrice: '',
          profitPercent: '',
          stock: '0',
          barcode: '',
          categoryId: defaultCategoryId || undefined,
          source: 'XML'
        } as ImportItem;
      }
      const name = getText(prod, 'xProd');
      const sku = getText(prod, 'cProd');
      const ncm = getText(prod, 'NCM');
      const cest = getText(prod, 'CEST');
      const barcode = getText(prod, 'cEAN') || getText(prod, 'cEANTrib');
      const qty = getText(prod, 'qCom');
      const unit = getText(prod, 'vUnCom') || getText(prod, 'vUnTrib');
      const total = getText(prod, 'vProd');
      const price = unit || (qty && total ? String(Number(total) / Number(qty)) : '');

      const icmsNode = det.getElementsByTagName('ICMS')[0] || det.getElementsByTagNameNS('*', 'ICMS')[0];
      const origin = icmsNode ? getText(icmsNode, 'orig') : '';

      return {
        id: `xml-${index}`,
        include: true,
        name,
        sku,
        ncm,
        cest,
        taxType: 'TRIBUTADO',
        origin,
        salePrice: parseNumber(price),
        costPrice: '',
        profitPercent: '',
        stock: '0',
        barcode,
        categoryId: defaultCategoryId || undefined,
        source: 'XML'
      } as ImportItem;
    });
    setItems(mapped.map((item) => normalizePricing(item)));
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setSelectedFileName(file.name);
    setError('');
    setMessage('');
    try {
      if (fileType === 'excel') {
        await parseExcel(file);
      } else {
        await parseXml(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    }
  };

  const validateRow = useCallback((item: ImportItem) => {
    if (!item.include) return null;
    if (!item.name.trim()) return 'Nome obrigatório';
    if (!item.sku.trim()) return 'SKU obrigatório';
    if (!/^\d{8}$/.test(item.ncm.trim())) return 'NCM inválido';
    if (item.cest && !/^\d{7}$/.test(item.cest.trim())) return 'CEST inválido';
    if (!item.taxType) return 'Tributação obrigatória';
    if (!item.origin) return 'Origem obrigatória';
    if (!item.categoryId && !defaultCategoryId) return 'Categoria obrigatória';
    if (toNumber(item.salePrice) === null) return 'Preço de venda obrigatório';
    return null;
  }, [defaultCategoryId]);

  const stats = useMemo(() => {
    const total = items.length;
    const selected = items.filter((item) => item.include).length;
    const withError = items.filter((item) => validateRow(item)).length;
    return { total, selected, withError };
  }, [items, validateRow]);

  const canImport = stats.selected > 0 && !importing;

  const handleImport = async () => {
    if (!token) return;
    setError('');
    setMessage('');
    const rows = items.filter((item) => item.include);
    if (!rows.length) {
      setError('Selecione ao menos um produto para importar.');
      return;
    }
    setImporting(true);
    try {
      let resolvedCategoryId = defaultCategoryId;
      if (!resolvedCategoryId && defaultCategoryName.trim()) {
        const existing = categories.find(
          (cat) => cat.name.toLowerCase() === defaultCategoryName.trim().toLowerCase()
        );
        if (existing) {
          resolvedCategoryId = existing.id;
        } else {
          const created = await apiRequest<Category>(
            '/categories',
            { method: 'POST', body: JSON.stringify({ name: defaultCategoryName.trim() }) },
            token
          );
          resolvedCategoryId = created.id;
          await loadCategories();
        }
      }

      const results: { ok: number; fail: number } = { ok: 0, fail: 0 };

      for (const item of rows) {
        const normalizedItem = normalizePricing(item);
        const errorRow = validateRow(normalizedItem);
        if (errorRow) {
          results.fail += 1;
          continue;
        }
        const categoryId = normalizedItem.categoryId || resolvedCategoryId;
        if (!categoryId) {
          results.fail += 1;
          continue;
        }
        try {
          await apiRequest(
            '/products',
            {
              method: 'POST',
              body: JSON.stringify({
                name: normalizedItem.name.trim(),
                sku: normalizedItem.sku.trim(),
                ncm: normalizedItem.ncm.trim(),
                cest: normalizedItem.cest.trim() || undefined,
                taxType: normalizedItem.taxType,
                origin: Number(normalizedItem.origin),
                stock: Number(normalizedItem.stock || 0),
                price: Number(normalizedItem.salePrice || 0),
                costPrice: normalizedItem.costPrice ? Number(normalizedItem.costPrice) : undefined,
                barcode: normalizedItem.barcode.trim() || undefined,
                categoryId
              })
            },
            token
          );
          results.ok += 1;
        } catch {
          results.fail += 1;
        }
      }

      setMessage(`Importação finalizada: ${results.ok} importados, ${results.fail} com erro.`);
      router.push('/produtos');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)', transition: 'background 0.2s' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --np-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }
        .pl-tr:hover { background: var(--surface) !important; }
        .pl-table-wrap { -webkit-overflow-scrolling: touch; }
        @media (max-width: 900px) {
          .np-grid-2 { grid-template-columns: 1fr !important; }
          .np-steps { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
          .np-connector { display: none !important; }
          .pl-table { display: none !important; }
          .table-cards { display: grid !important; }
        }
      `}</style>

      <div style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em' }}>
              Importar produtos
            </div>
            <div style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>
              Envie Excel ou XML, revise e confirme a importação.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => router.push('/produtos')}
              style={{
                padding: '7px 14px', background: tk.surface,
                border: `1px solid ${tk.border}`, borderRadius: '8px',
                color: tk.textSub, cursor: 'pointer', fontSize: '13px',
                fontFamily: 'var(--np-font)',
              }}
            >
              Voltar
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: tk.successBg,
            border: `1px solid ${tk.successBorder}`, borderRadius: '10px',
          }}>
            <span style={{ fontSize: '13.5px', color: tk.success, fontWeight: '500' }}>{message}</span>
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tk.success, display: 'flex' }}>{Ic.x}</button>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: tk.errorBg,
            border: `1px solid ${tk.errorBorder}`, borderRadius: '10px',
          }}>
            <span style={{ fontSize: '13.5px', color: tk.error, fontWeight: '500' }}>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tk.error, display: 'flex' }}>{Ic.x}</button>
          </div>
        )}

        {/* ── Step tracker ── */}
        <div style={{
          background: tk.surface, border: `1px solid ${tk.border}`,
          borderRadius: '12px', padding: '20px 24px',
          boxShadow: tk.shadow,
        }}>
          <div className="np-steps" style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {STEPS.map((s, i) => {
              const done = step > s.n;
              const active = step === s.n;
              return (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'unset' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? tk.stepDone : active ? tk.stepActive : tk.stepInactive,
                      color: done || active ? '#fff' : tk.textMuted,
                      fontSize: '12px', fontWeight: '600', flexShrink: 0,
                      transition: 'all 0.2s',
                      border: active ? `2px solid ${tk.stepActive}` : done ? `2px solid ${tk.stepDone}` : `2px solid ${tk.stepInactive}`,
                      boxShadow: active ? `0 0 0 4px ${tk.accent}20` : 'none',
                    }}>
                      {done ? Ic.check : s.n}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: active ? tk.text : done ? tk.success : tk.textMuted, transition: 'color 0.2s' }}>
                        {s.label}
                      </span>
                      <span style={{ fontSize: '11px', color: tk.textMuted }}>
                        {s.desc}
                      </span>
                    </div>
                  </div>

                  {i < STEPS.length - 1 && (
                    <div className="np-connector" style={{
                      flex: 1, height: '2px', margin: '0 12px',
                      background: done ? tk.stepDone : tk.stepInactive,
                      borderRadius: '2px', transition: 'background 0.2s',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── File + category card ── */}
        <div style={{
          background: tk.surface, border: `1px solid ${tk.border}`,
          borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow,
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: `1px solid ${tk.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text, letterSpacing: '-0.01em' }}>
                Arquivo e categoria padrão
              </div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>
                Defina a origem e uma categoria opcional para todos os itens importados.
              </div>
            </div>
            <span style={{ fontSize: '11.5px', color: tk.textMuted, background: tk.chipBg, padding: '4px 10px', borderRadius: '20px' }}>
              Etapa {step} de {STEPS.length}
            </span>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Tipo de arquivo" tk={tk}>
                <Select
                  value={fileType}
                  onChange={(value) => setFileType(value as 'excel' | 'xml')}
                  options={[
                    { value: 'excel', label: 'Excel (.xlsx)' },
                    { value: 'xml', label: 'XML (NFe)' },
                  ]}
                  tk={tk}
                />
              </Field>
              <Field label="Arquivo" tk={tk} hint="Envie Excel (.xlsx) ou XML de NFe.">
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    const file = event.dataTransfer.files?.[0] || null;
                    handleFile(file);
                  }}
                  style={{
                    border: `1px dashed ${dragActive ? tk.accent : tk.border}`,
                    background: dragActive ? `${tk.accent}12` : tk.inputMuted,
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <input
                    id="import-file"
                    type="file"
                    accept={fileType === 'excel' ? '.xlsx,.xls' : '.xml'}
                    onChange={(event) => handleFile(event.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: tk.text }}>
                        Arraste o arquivo aqui
                      </div>
                      <div style={{ fontSize: '12px', color: tk.textMuted }}>
                        ou clique para selecionar ({fileType === 'excel' ? 'Excel (.xlsx)' : 'XML (NFe)'})
                      </div>
                    </div>
                    <label
                      htmlFor="import-file"
                      style={{
                        padding: '7px 14px',
                        background: tk.surface,
                        border: `1px solid ${tk.border}`,
                        borderRadius: '8px',
                        color: tk.text,
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        fontFamily: 'var(--np-font)',
                      }}
                    >
                      Selecionar arquivo
                    </label>
                  </div>
                  {selectedFileName ? (
                    <div style={{ fontSize: '12px', color: tk.textSub }}>
                      Arquivo selecionado: <strong style={{ color: tk.text }}>{selectedFileName}</strong>
                    </div>
                  ) : null}
                </div>
              </Field>
            </div>

            <div style={{
              padding: '16px',
              border: `1px solid ${tk.border}`,
              borderRadius: '10px',
              background: tk.inputMuted,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <Field label="Categoria padrão" tk={tk} hint="Digite para selecionar uma categoria existente ou criar uma nova.">
                <div className="autocomplete">
                  <input
                    value={defaultCategoryName}
                    placeholder="Digite para selecionar ou criar"
                    onChange={(event) => {
                      const value = event.target.value;
                      setDefaultCategoryName(value);
                      const match = categories.find((cat) => cat.name.toLowerCase() === value.toLowerCase());
                      setDefaultCategoryId(match?.id || '');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 13px',
                      background: tk.inputBg,
                      border: `1px solid ${tk.inputBorder}`,
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      color: tk.text,
                      fontFamily: 'var(--np-font)',
                      outline: 'none',
                    }}
                  />
                  {defaultCategoryName && filteredCategories.length > 0 ? (
                    <div className="suggestions">
                      {filteredCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className="suggestion-item"
                          onClick={() => {
                            setDefaultCategoryName(category.name);
                            setDefaultCategoryId(category.id);
                          }}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  ) : defaultCategoryName ? (
                    <div style={{ fontSize: '11.5px', color: tk.textMuted, marginTop: '6px' }}>
                      Nenhuma categoria encontrada. Ela será criada ao importar.
                    </div>
                  ) : null}
                </div>
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: tk.textSub, fontFamily: 'var(--np-font)' }}>
                <input
                  type="checkbox"
                  checked={applyDefaultToAll}
                  onChange={(event) => setApplyDefaultToAll(event.target.checked)}
                />
                Aplicar categoria padrão em todos os itens
              </label>
            </div>
          </div>
        </div>

        {/* ── Review card ── */}
        <div style={{
          background: tk.surface, border: `1px solid ${tk.border}`,
          borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow,
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: `1px solid ${tk.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text, letterSpacing: '-0.01em' }}>
                Revisão dos itens
              </div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>
                Ajuste dados fiscais e confira o que será importado.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', color: tk.textMuted, background: tk.chipBg, padding: '4px 10px', borderRadius: '20px' }}>
                Total {stats.total}
              </span>
              <span style={{ fontSize: '11.5px', color: tk.accentText, background: tk.accentBg, padding: '4px 10px', borderRadius: '20px' }}>
                Selecionados {stats.selected}
              </span>
              {stats.withError > 0 ? (
                <span style={{ fontSize: '11.5px', color: tk.error, background: tk.errorBg, padding: '4px 10px', borderRadius: '20px' }}>
                  Com erro {stats.withError}
                </span>
              ) : null}
            </div>
          </div>
          <div style={{ padding: '0 0 8px' }}>
            {items.length === 0 ? (
              <div className="empty-state" style={{ margin: '20px' }}>
                <strong>Nenhum item carregado</strong>
                <span>Selecione um arquivo Excel ou XML para iniciar a revisão.</span>
              </div>
            ) : (
              <>
                <div className="pl-table-wrap" style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: 'var(--shadow)', margin: '16px 20px' }}>
                  <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1300px' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${tk.surface}` }}>
                        {(
                          [
                            { label: 'Importar', width: '70px' },
                            { label: 'Nome', width: '240px' },
                            { label: 'SKU', width: '110px' },
                            { label: 'NCM', width: '90px' },
                            { label: 'CEST', width: '80px' },
                            { label: 'Tributação', width: '130px' },
                            { label: 'Origem', width: '90px' },
                            { label: 'Preço entrada', width: '110px' },
                            { label: 'Preço venda', width: '110px' },
                            { label: 'Lucro %', width: '90px' },
                            { label: 'Estoque', width: '90px' },
                            { label: 'Categoria', width: '160px' },
                            { label: 'Origem arquivo', width: '130px' },
                          ] as { label: string; width: string }[]
                        ).map(({ label, width }, i) => (
                          <th
                            key={i}
                            style={{
                              width,
                              padding: '11px 14px',
                              textAlign: 'left',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              color: tk.textSub,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              fontFamily: 'var(--np-font)',
                              background: tk.surface,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const rowError = validateRow(item);
                        return (
                          <tr
                            key={item.id}
                            className="pl-tr"
                            title={rowError || undefined}
                            style={{
                              borderBottom: idx < items.length - 1 ? `1px solid ${tk.surface}` : 'none',
                              background: tk.surface,
                              transition: 'background 0.12s',
                              opacity: item.include ? 1 : 0.6,
                              boxShadow: rowError ? 'inset 3px 0 0 #ef4444' : 'none',
                            }}
                          >
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                type="checkbox"
                                checked={item.include}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? { ...row, include: event.target.checked } : row
                                    )
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                className="table-input"
                                value={item.name}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? { ...row, name: event.target.value } : row
                                    )
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                className="table-input"
                                value={item.sku}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? { ...row, sku: event.target.value } : row
                                    )
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                className="table-input"
                                value={item.ncm}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? { ...row, ncm: event.target.value } : row
                                    )
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                className="table-input"
                                value={item.cest}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? { ...row, cest: event.target.value } : row
                                    )
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <select
                                className="table-select"
                                value={item.taxType}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? { ...row, taxType: event.target.value } : row
                                    )
                                  )
                                }
                              >
                                {TAX_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <select
                                className="table-select"
                                value={item.origin}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? { ...row, origin: event.target.value } : row
                                    )
                                  )
                                }
                              >
                                <option value="">-</option>
                                {ORIGIN_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.value}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                className="table-input"
                                value={item.costPrice}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? updatePricingField(row, 'costPrice', event.target.value) : row
                                    )
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                className="table-input"
                                value={item.salePrice}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? updatePricingField(row, 'salePrice', event.target.value) : row
                                    )
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                className="table-input"
                                value={item.profitPercent}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? updatePricingField(row, 'profitPercent', event.target.value) : row
                                    )
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                className="table-input"
                                value={item.stock}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? { ...row, stock: event.target.value } : row
                                    )
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <select
                                className="table-select"
                                value={item.categoryId || ''}
                                onChange={(event) =>
                                  setItems((current) =>
                                    current.map((row) =>
                                      row.id === item.id ? { ...row, categoryId: event.target.value } : row
                                    )
                                  )
                                }
                              >
                                <option value="">Selecionar</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontSize: '12px', color: tk.textSub }}>
                              {item.source || '-'}
                              {rowError ? <small className="row-error-text"> · {rowError}</small> : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="table-cards">
                  {items.map((item) => {
                    const rowError = validateRow(item);
                    return (
                      <div
                        className="table-card"
                        key={item.id}
                        title={rowError || undefined}
                        style={{
                          opacity: item.include ? 1 : 0.7,
                          boxShadow: rowError ? 'inset 3px 0 0 #ef4444' : 'var(--shadow)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label className="pill">
                            <input
                              type="checkbox"
                              checked={item.include}
                              onChange={(event) =>
                                setItems((current) =>
                                  current.map((row) =>
                                    row.id === item.id ? { ...row, include: event.target.checked } : row
                                  )
                                )
                              }
                            />
                            Importar
                          </label>
                          {rowError ? <small className="row-error-text">{rowError}</small> : null}
                        </div>
                        <input
                          className="table-input"
                          value={item.name}
                          placeholder="Nome"
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((row) =>
                                row.id === item.id ? { ...row, name: event.target.value } : row
                              )
                            )
                          }
                        />
                        <div className="form-grid">
                          <input
                            className="table-input"
                            value={item.sku}
                            placeholder="SKU"
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? { ...row, sku: event.target.value } : row
                                )
                              )
                            }
                          />
                          <input
                            className="table-input"
                            value={item.ncm}
                            placeholder="NCM"
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? { ...row, ncm: event.target.value } : row
                                )
                              )
                            }
                          />
                        </div>
                        <div className="form-grid">
                          <input
                            className="table-input"
                            value={item.cest}
                            placeholder="CEST"
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? { ...row, cest: event.target.value } : row
                                )
                              )
                            }
                          />
                          <select
                            className="table-select"
                            value={item.taxType}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? { ...row, taxType: event.target.value } : row
                                )
                              )
                            }
                          >
                            {TAX_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-grid">
                          <select
                            className="table-select"
                            value={item.origin}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? { ...row, origin: event.target.value } : row
                                )
                              )
                            }
                          >
                            <option value="">Origem</option>
                            {ORIGIN_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.value}
                              </option>
                            ))}
                          </select>
                          <select
                            className="table-select"
                            value={item.categoryId || ''}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? { ...row, categoryId: event.target.value } : row
                                )
                              )
                            }
                          >
                            <option value="">Categoria</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-grid">
                          <input
                            className="table-input"
                            value={item.costPrice}
                            placeholder="Preço entrada"
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? updatePricingField(row, 'costPrice', event.target.value) : row
                                )
                              )
                            }
                          />
                          <input
                            className="table-input"
                            value={item.salePrice}
                            placeholder="Preço venda"
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? updatePricingField(row, 'salePrice', event.target.value) : row
                                )
                              )
                            }
                          />
                        </div>
                        <div className="form-grid">
                          <input
                            className="table-input"
                            value={item.profitPercent}
                            placeholder="Lucro %"
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? updatePricingField(row, 'profitPercent', event.target.value) : row
                                )
                              )
                            }
                          />
                          <input
                            className="table-input"
                            value={item.stock}
                            placeholder="Estoque"
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? { ...row, stock: event.target.value } : row
                                )
                              )
                            }
                          />
                        </div>
                        <span className="meta">Origem arquivo: {item.source || '-'}</span>
                      </div>
                    );
                  })}
                </div>
                {stats.withError > 0 ? (
                  <div style={{
                    margin: '12px 20px 4px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: tk.errorBg,
                    border: `1px solid ${tk.errorBorder}`,
                    fontSize: '12.5px',
                    color: tk.error,
                    fontWeight: 500,
                  }}>
                    Existem {stats.withError} item(ns) com erro. Corrija ou desmarque para prosseguir.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {items.length > 0 ? (
          <div style={{
            background: tk.surface,
            border: `1px solid ${tk.border}`,
            borderRadius: '12px',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            boxShadow: tk.shadow,
          }}>
            <button
              onClick={handleImport}
              disabled={!canImport}
              style={{
                padding: '9px 16px',
                background: canImport ? tk.accent : tk.disabledBg,
                border: `1px solid ${canImport ? tk.accent : tk.border}`,
                color: canImport ? '#fff' : tk.textMuted,
                borderRadius: '8px',
                cursor: canImport ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'var(--np-font)',
                opacity: importing ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              title={!canImport ? 'Selecione pelo menos um item para importar.' : undefined}
            >
              {importing ? 'Importando...' : 'Importar selecionados'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
