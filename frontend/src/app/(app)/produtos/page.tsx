'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiRequest, fileUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

/* ─── Types ──────────────────────────────────────────────── */

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  ncm?: string | null;
  cest?: string | null;
  taxType?: string | null;
  origin?: number | null;
  stock: number;
  price: number;
  barcode?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
};

/* ─── Constants ──────────────────────────────────────────── */

const ORIGIN_OPTIONS = [
  { value: 0, label: '0 - Nacional' },
  { value: 1, label: '1 - Estrangeira (importação direta)' },
  { value: 2, label: '2 - Estrangeira (mercado interno)' },
  { value: 3, label: '3 - Nacional (conteúdo importado > 40%)' },
  { value: 4, label: '4 - Nacional (processo produtivo básico)' },
  { value: 5, label: '5 - Nacional (conteúdo importado <= 40%)' },
  { value: 6, label: '6 - Estrangeira (sem similar nacional)' },
  { value: 7, label: '7 - Estrangeira (mercado interno s/ similar)' },
  { value: 8, label: '8 - Nacional (conteúdo importado > 70%)' },
];

/* ─── Icons ──────────────────────────────────────────────── */

const Ic = {
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  plus: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  upload: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  filter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  chevronUp: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  x: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  box: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  chevronLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

/* ─── Helpers ────────────────────────────────────────────── */

const PAGE_SIZE = 10;

type SortKey = 'name' | 'sku' | 'stock' | 'price' | 'categoryName';
type SortDir = 'asc' | 'desc';

/* ─── Main Page ──────────────────────────────────────────── */

export default function ProdutosPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const tk = useMemo(
    () => ({
      bg: 'var(--bg)',
      surface: 'var(--card)',
      surfaceAlt: 'var(--surface)',
      border: 'var(--border)',
      text: 'var(--ink)',
      textSub: 'var(--muted)',
      accent: 'var(--accent)',
      accentDark: 'var(--accent-dark)',
      chipBg: 'var(--sidebar-active-bg)',
      chipText: 'var(--accent-dark)',
      success: '#16a34a',
      successBg: 'rgba(22, 163, 74, 0.12)',
      successBorder: 'rgba(22, 163, 74, 0.28)',
      danger: '#ef4444',
      dangerBg: 'rgba(239, 68, 68, 0.12)',
      dangerBorder: 'rgba(239, 68, 68, 0.28)',
      warning: '#f59e0b',
      warningBg: 'rgba(245, 158, 11, 0.12)',
      warningBorder: 'rgba(245, 158, 11, 0.28)',
      muted: 'var(--muted)',
    }),
    []
  );

  // Filters & sort
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const loadProducts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<Product[]>('/products', {}, token);
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterCategory, filterOrigin]);

  const originLabel = useMemo(() => {
    const map = new Map(ORIGIN_OPTIONS.map((item) => [String(item.value), item.label]));
    return (value?: number | null) =>
      value === null || value === undefined ? '—' : map.get(String(value)) || String(value);
  }, []);

  const originShort = useMemo(() => {
    return (value?: number | null) => {
      if (value === null || value === undefined) return '—';
      const label = ORIGIN_OPTIONS.find((o) => o.value === value)?.label || String(value);
      return label.split(' - ')[0];
    };
  }, []);

  // Unique categories for filter
  const allCategories = useMemo(() => {
    const cats = products.map((p) => p.categoryName).filter(Boolean) as string[];
    return Array.from(new Set(cats)).sort();
  }, [products]);

  // Filtered + sorted + paginated
  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.ncm || '').includes(q) ||
          (p.barcode || '').includes(q) ||
          (p.categoryName || '').toLowerCase().includes(q)
      );
    }
    if (filterCategory) list = list.filter((p) => p.categoryName === filterCategory);
    if (filterOrigin !== '') list = list.filter((p) => String(p.origin) === filterOrigin);

    list.sort((a, b) => {
      let av: string | number = a[sortKey] ?? '';
      let bv: string | number = b[sortKey] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, search, filterCategory, filterOrigin, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ color: tk.textSub, display: 'flex' }}>{Ic.chevronDown}</span>;
    return <span style={{ color: tk.accent, display: 'flex' }}>{sortDir === 'asc' ? Ic.chevronUp : Ic.chevronDown}</span>;
  };

  const hasFilters = search || filterCategory || filterOrigin !== '';
  const clearFilters = () => { setSearch(''); setFilterCategory(''); setFilterOrigin(''); };

  // ── Stock badge ──
  const stockBadge = (stock: number) => {
    const low = stock <= 5;
    const zero = stock === 0;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
        background: zero ? tk.dangerBg : low ? tk.warningBg : tk.successBg,
        color: zero ? tk.danger : low ? tk.warning : tk.success,
        fontFamily: 'var(--pl-font)',
      }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
        {stock}
      </span>
    );
  };

  return (
    <div style={{ padding: 0, background: tk.bg, minHeight: '100%', fontFamily: 'var(--pl-font)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --pl-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }
        .pl-th { cursor: pointer; user-select: none; }
        .pl-th:hover { color: var(--ink) !important; }
        .pl-tr:hover { background: var(--surface) !important; }
        .pl-tr:hover .pl-name { color: var(--accent) !important; }
        .pl-table-wrap { -webkit-overflow-scrolling: touch; }
        @media (max-width: 900px) {
          .pl-filters { flex-direction: column !important; }
          .pl-table-wrap { overflow-x: auto; }
          .pl-table { display: none !important; }
          .pl-cards { display: grid !important; }
          .pl-table-wrap { padding: 16px; }
        }
      `}</style>

      <div style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>
              Produtos
            </h1>
            <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>
              Controle de catálogo, estoque e preços com dados fiscais.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              href="/produtos/importar"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', background: tk.surface,
                border: `1px solid ${tk.border}`, borderRadius: '8px',
                color: tk.text, textDecoration: 'none', fontSize: '13.5px',
                fontWeight: '500', fontFamily: 'var(--pl-font)',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = tk.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = tk.border)}
            >
              {Ic.upload} Importar
            </Link>
            <Link
              href="/produtos/novo"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', background: tk.accent,
                border: `1px solid ${tk.accent}`, borderRadius: '8px',
                color: '#fff', textDecoration: 'none', fontSize: '13.5px',
                fontWeight: '600', fontFamily: 'var(--pl-font)',
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {Ic.plus} Novo produto
            </Link>
          </div>
        </div>

        {/* ── Message ── */}
        {message && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 16px', background: tk.successBg,
            border: `1px solid ${tk.successBorder}`, borderRadius: '9px',
          }}>
            <span style={{ fontSize: '13.5px', color: tk.success, fontWeight: '500' }}>{message}</span>
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tk.success, display: 'flex' }}>{Ic.x}</button>
          </div>
        )}

        {/* ── Filters bar ── */}
        <div style={{
          background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px',
          padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px',
          boxShadow: 'var(--shadow)',
        }}>
          <div className="pl-filters" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: tk.textSub, display: 'flex', pointerEvents: 'none' }}>
                {Ic.search}
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, SKU, NCM ou código..."
                style={{
                  width: '100%', padding: '8px 12px 8px 32px',
                  background: tk.surfaceAlt, border: `1px solid ${tk.border}`,
                  borderRadius: '8px', fontSize: '13.5px', color: tk.text,
                  fontFamily: 'var(--pl-font)', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = tk.accent)}
                onBlur={(e) => (e.target.style.borderColor = tk.border)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: tk.textSub, display: 'flex', padding: 0 }}>
                  {Ic.x}
                </button>
              )}
            </div>

            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                padding: '8px 32px 8px 12px', background: tk.surfaceAlt,
                border: `1px solid ${tk.border}`, borderRadius: '8px',
                fontSize: '13.5px', color: filterCategory ? tk.text : tk.textSub,
                fontFamily: 'var(--pl-font)', outline: 'none', cursor: 'pointer',
                appearance: 'none', flex: '0 1 160px', minWidth: '140px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
              }}
            >
              <option value="">Todas categorias</option>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Origin filter */}
            <select
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              style={{
                padding: '8px 32px 8px 12px', background: tk.surfaceAlt,
                border: `1px solid ${tk.border}`, borderRadius: '8px',
                fontSize: '13.5px', color: filterOrigin !== '' ? tk.text : tk.textSub,
                fontFamily: 'var(--pl-font)', outline: 'none', cursor: 'pointer',
                appearance: 'none', flex: '0 1 160px', minWidth: '140px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
              }}
            >
              <option value="">Todas origens</option>
              {ORIGIN_OPTIONS.map((o) => <option key={o.value} value={String(o.value)}>{o.label}</option>)}
            </select>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '8px 12px', background: 'none',
                  border: `1px solid ${tk.dangerBorder}`, borderRadius: '8px',
                  color: tk.danger, cursor: 'pointer', fontSize: '13px',
                  fontFamily: 'var(--pl-font)', whiteSpace: 'nowrap',
                }}
              >
                {Ic.x} Limpar
              </button>
            )}
          </div>

          {/* Results count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: tk.textSub }}>
              {filtered.length === products.length
                ? `${products.length} produto${products.length !== 1 ? 's' : ''}`
                : `${filtered.length} de ${products.length} produto${products.length !== 1 ? 's' : ''}`}
            </span>
            {hasFilters && (
              <span style={{ fontSize: '11.5px', background: tk.chipBg, color: tk.chipText, padding: '2px 8px', borderRadius: '20px', fontWeight: '500' }}>
                {Ic.filter} filtrado
              </span>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="pl-table-wrap" style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: 'var(--shadow)' }}>

          {loading ? (
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: '52px', background: tk.surfaceAlt, borderRadius: '8px', animation: `pulse 1.5s ease-in-out ${i * 0.08}s infinite` }} />
              ))}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: tk.textSub }}>{Ic.box}</span>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>
                {hasFilters ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </div>
              <div style={{ fontSize: '13px', color: tk.textSub }}>
                {hasFilters ? 'Tente ajustar os filtros ou limpar a busca.' : 'Comece adicionando seu primeiro produto.'}
              </div>
              {!hasFilters && (
                <Link href="/produtos/novo" style={{ marginTop: '4px', padding: '9px 18px', background: tk.accent, color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13.5px', fontWeight: '600', fontFamily: 'var(--pl-font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {Ic.plus} Novo produto
                </Link>
              )}
            </div>
          ) : (
            <>
              <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tk.surfaceAlt}` }}>
                  {/* Fixed cols */}
                  {(
                    [
                      { key: null, label: '', width: '52px' },
                      { key: 'name', label: 'Nome', width: 'auto' },
                      { key: 'sku', label: 'SKU', width: '110px' },
                      { key: 'categoryName', label: 'Categoria', width: '130px' },
                      { key: null, label: 'NCM', width: '90px' },
                      { key: null, label: 'CEST', width: '80px' },
                      { key: null, label: 'Tributação', width: '120px' },
                      { key: null, label: 'Origem', width: '80px' },
                      { key: null, label: 'Barcode', width: '110px' },
                      { key: 'stock', label: 'Estoque', width: '90px' },
                      { key: 'price', label: 'Preço', width: '100px' },
                    ] as { key: SortKey | null; label: string; width: string }[]
                  ).map(({ key, label, width }, i) => (
                    <th
                      key={i}
                      className={key ? 'pl-th' : ''}
                      onClick={() => key && handleSort(key)}
                      style={{
                        width, padding: '11px 14px', textAlign: 'left',
                        fontSize: '11.5px', fontWeight: '600', color: sortKey === key ? tk.text : tk.textSub,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        fontFamily: 'var(--pl-font)', background: tk.surface,
                        whiteSpace: 'nowrap', userSelect: 'none',
                      }}
                    >
                      {label && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {label}
                          {key && <SortIcon col={key} />}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="pl-tr"
                    style={{
                      borderBottom: idx < paginated.length - 1 ? `1px solid ${tk.surfaceAlt}` : 'none',
                      background: tk.surface, transition: 'background 0.12s',
                    }}
                  >
                    {/* Thumb */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '8px',
                        background: tk.surfaceAlt, border: `1px solid ${tk.border}`,
                        overflow: 'hidden', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                      }}>
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fileUrl(item.imageUrl)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: '700', color: tk.textSub, fontFamily: 'var(--pl-font)' }}>
                            {item.name?.[0]?.toUpperCase() || 'P'}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Name */}
                    <td style={{ padding: '10px 14px' }}>
                      <Link
                        href={`/produtos/${item.id}`}
                        className="pl-name"
                        style={{
                          fontSize: '13.5px', fontWeight: '500', color: tk.text,
                          textDecoration: 'none', fontFamily: 'var(--pl-font)',
                          transition: 'color 0.12s', display: 'block',
                        }}
                      >
                        {item.name}
                      </Link>
                    </td>
                    {/* SKU */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '12.5px', color: tk.textSub, fontFamily: 'monospace', background: tk.surfaceAlt, padding: '2px 7px', borderRadius: '5px', border: `1px solid ${tk.border}` }}>
                        {item.sku || '—'}
                      </span>
                    </td>
                    {/* Category */}
                    <td style={{ padding: '10px 14px' }}>
                      {item.categoryName ? (
                        <span style={{ fontSize: '12.5px', color: tk.text, background: tk.surfaceAlt, padding: '3px 9px', borderRadius: '20px', fontWeight: '500', fontFamily: 'var(--pl-font)', whiteSpace: 'nowrap' }}>
                          {item.categoryName}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12.5px', color: tk.textSub }}>—</span>
                      )}
                    </td>
                    {/* NCM */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '12.5px', color: tk.textSub, fontFamily: 'monospace' }}>{item.ncm || '—'}</span>
                    </td>
                    {/* CEST */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '12.5px', color: tk.textSub, fontFamily: 'monospace' }}>{item.cest || '—'}</span>
                    </td>
                    {/* Tax Type */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '12px', color: tk.textSub, fontFamily: 'var(--pl-font)' }}>
                        {item.taxType || '—'}
                      </span>
                    </td>
                    {/* Origin */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '12px', color: tk.textSub, fontFamily: 'var(--pl-font)' }} title={originLabel(item.origin)}>
                        {originShort(item.origin)}
                      </span>
                    </td>
                    {/* Barcode */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '12px', color: tk.textSub, fontFamily: 'monospace' }}>{item.barcode || '—'}</span>
                    </td>
                    {/* Stock */}
                    <td style={{ padding: '10px 14px' }}>
                      {stockBadge(item.stock)}
                    </td>
                    {/* Price */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: '600', color: tk.text, fontFamily: 'var(--pl-font)' }}>
                        R$ {Number(item.price).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>

              <div className="pl-cards" style={{ display: 'none', gap: '12px' }}>
                {paginated.map((item) => (
                  <div key={item.id} style={{
                    border: `1px solid ${tk.border}`,
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'grid',
                    gap: '10px',
                    background: tk.surface,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '10px',
                        background: tk.surfaceAlt, border: `1px solid ${tk.border}`,
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fileUrl(item.imageUrl)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '14px', fontWeight: '700', color: tk.textSub, fontFamily: 'var(--pl-font)' }}>
                            {item.name?.[0]?.toUpperCase() || 'P'}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Link href={`/produtos/${item.id}`} style={{ fontSize: '14px', fontWeight: '600', color: tk.text, textDecoration: 'none' }}>
                          {item.name}
                        </Link>
                        <div style={{ fontSize: '12px', color: tk.textSub, marginTop: '2px' }}>
                          SKU: {item.sku || '—'} · NCM: {item.ncm || '—'}
                        </div>
                      </div>
                      {stockBadge(item.stock)}
                    </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {item.categoryName && (
                    <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>
                      {item.categoryName}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: tk.textSub, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>
                    Origem {originShort(item.origin)}
                  </span>
                  <span style={{ fontSize: '12px', color: tk.textSub, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>
                    {item.taxType || '—'}
                  </span>
                  <span style={{ fontSize: '12px', color: tk.textSub, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>
                    CEST {item.cest || '—'}
                  </span>
                      <span style={{ fontSize: '12px', color: tk.textSub, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>
                        Barcode {item.barcode || '—'}
                      </span>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: '600', color: tk.text }}>
                      R$ {Number(item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Pagination ── */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{
              padding: '14px 18px', borderTop: `1px solid ${tk.surfaceAlt}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
            }}>
              <span style={{ fontSize: '12.5px', color: tk.textSub, fontFamily: 'var(--pl-font)' }}>
                Página {page} de {totalPages} · {filtered.length} resultados
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '6px 10px',
                    background: 'none', border: `1px solid ${tk.border}`, borderRadius: '7px',
                    cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? tk.textSub : tk.text,
                    transition: 'all 0.12s',
                  }}
                >
                  {Ic.chevronLeft}
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const n = start + i;
                  if (n > totalPages) return null;
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      style={{
                        padding: '6px 11px', borderRadius: '7px', cursor: 'pointer',
                        background: n === page ? tk.accent : 'none',
                        border: `1px solid ${n === page ? tk.accent : tk.border}`,
                        color: n === page ? '#fff' : tk.text,
                        fontSize: '13px', fontFamily: 'var(--pl-font)', fontWeight: n === page ? '600' : '400',
                        transition: 'all 0.12s',
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '6px 10px',
                    background: 'none', border: `1px solid ${tk.border}`, borderRadius: '7px',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? tk.textSub : tk.text,
                    transition: 'all 0.12s',
                  }}
                >
                  {Ic.chevronRight}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
