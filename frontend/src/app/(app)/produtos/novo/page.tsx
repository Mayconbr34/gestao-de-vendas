'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, apiUpload } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';

/* ─── Types ────────────────────────────────────────────── */

type Category = { id: string; name: string };
type Product = { id: string };

/* ─── Constants ─────────────────────────────────────────── */

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

const STEPS = [
  { n: 1, label: 'Produto', desc: 'Dados básicos' },
  { n: 2, label: 'Fiscal', desc: 'NCM e origem' },
  { n: 3, label: 'Categoria', desc: 'Classificação' },
];

const TAX_TYPE_OPTIONS = [
  { value: 'TRIBUTADO', label: 'Tributado' },
  { value: 'ICMS_ST', label: 'Substituição tributária (ICMS-ST)' },
  { value: 'ISENTO', label: 'Isento' },
];

/* ─── Icons ──────────────────────────────────────────────── */

const Ic = {
  arrow: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  arrowLeft: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  save: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  image: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  x: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

/* ─── Theme tokens ───────────────────────────────────────── */

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
    labelBg: 'var(--card)',
    shadow: 'var(--shadow)',
    shadowHover: 'var(--shadow)',
    stepDone: '#16a34a',
    stepActive: 'var(--accent)',
    stepInactive: 'var(--border)',
    chipBg: 'var(--surface)',
    disabledBg: 'var(--surface)',
  };
}

/* ─── Reusable Field components ──────────────────────────── */

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
      {hint && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: tk.textMuted }}>
          <span style={{ display: 'flex' }}>{Ic.info}</span>
          <span style={{ fontSize: '11.5px', fontFamily: 'var(--np-font)' }}>{hint}</span>
        </div>
      )}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  tk,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  tk: ReturnType<typeof tokens>;
  error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '10px 13px',
        background: tk.inputBg,
        border: `1px solid ${error ? tk.error : focused ? tk.borderFocus : tk.inputBorder}`,
        borderRadius: '8px',
        fontSize: '13.5px',
        color: tk.text,
        fontFamily: 'var(--np-font)',
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: focused ? `0 0 0 3px ${tk.accent}20` : 'none',
      }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  tk,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
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
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '34px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: focused ? `0 0 0 3px ${tk.accent}20` : 'none',
      }}
    >
      <option value="">{placeholder || 'Selecione'}</option>
      {options.map((o) => (
        <option key={o.value} value={String(o.value)} style={{ background: tk.inputBg, color: tk.text }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function NovoProdutoPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [ncm, setNcm] = useState('');
  const [cest, setCest] = useState('');
  const [origin, setOrigin] = useState('');
  const [taxType, setTaxType] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const tk = tokens();

  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (!token) return;
    apiRequest<Category[]>('/categories', {}, token).then(setCategories).catch(() => {});
  }, [token]);

  const isValidNcm = /^\d{8}$/.test(ncm.trim());
  const isValidCest = !cest.trim() || /^\d{7}$/.test(cest.trim());

  const resetForm = () => {
    setName(''); setSku(''); setStock(''); setPrice(''); setBarcode('');
    setNcm(''); setCest(''); setOrigin(''); setTaxType(''); setCategoryQuery('');
    setCategoryId(null); setShowSuggestions(false); setStep(1);
    setImageFile(null); setImagePreview(null);
  };

  const createProduct = async () => {
    if (!token) return;
    setMessage(''); setFormError('');
    try {
      if (!isValidNcm) { setFormError('NCM deve ter 8 dígitos numéricos.'); return; }
      if (!isValidCest) { setFormError('CEST deve ter 7 dígitos numéricos.'); return; }
      if (!origin) { setFormError('Informe a origem do produto.'); return; }
      if (!taxType) { setFormError('Informe o tipo de tributação do produto.'); return; }

      const trimmedCategory = categoryQuery.trim();
      let resolvedCategoryId = categoryId;

      if (!resolvedCategoryId) {
        if (!trimmedCategory) { setFormError('Informe a categoria.'); return; }
        const created = await apiRequest<Category>('/categories', { method: 'POST', body: JSON.stringify({ name: trimmedCategory }) }, token);
        resolvedCategoryId = created.id;
      }

      if (!resolvedCategoryId) { setFormError('Selecione uma categoria.'); return; }

      setSaving(true);
      const created = await apiRequest<Product>('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(), sku: sku.trim(), ncm: ncm.trim(),
          cest: cest.trim() || undefined, origin: Number(origin),
          stock: Number(stock), price: Number(price),
          barcode: barcode.trim() || undefined, categoryId: resolvedCategoryId,
          taxType,
        }),
      }, token);

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        await apiUpload(`/products/${created.id}/image`, formData, token);
      }

      resetForm();
      setMessage('Produto criado com sucesso.');
      router.push('/produtos');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar produto');
    } finally {
      setSaving(false);
    }
  };

  const canContinueProduct = name.trim().length > 1 && sku.trim().length > 1 && price !== '' && stock !== '';
  const canContinueFiscal = isValidNcm && isValidCest && origin !== '' && taxType !== '';
  const canContinueCategory = categoryQuery.trim().length > 0;

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categoryQuery.trim().toLowerCase())
  );

  const originLabel = useMemo(() => {
    const map = new Map(ORIGIN_OPTIONS.map((item) => [String(item.value), item.label]));
    return (value?: number | null) => (value === null || value === undefined ? '—' : map.get(String(value)) || String(value));
  }, []);

  // ── Render ──

  return (
    <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)', transition: 'background 0.2s' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --np-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        @media (max-width: 700px) {
          .np-grid-2 { grid-template-columns: 1fr !important; }
          .np-steps { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
          .np-connector { display: none !important; }
          .np-header-actions { width: 100% !important; justify-content: flex-start !important; flex-wrap: wrap !important; }
        }
      `}</style>

      <div className="np-container" style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Top header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em' }}>
              Cadastrar produto
            </div>
            <div style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>
              Preencha os dados de catálogo e informações fiscais do item.
            </div>
          </div>
          <div className="np-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        {/* ── Success banner ── */}
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
                  {/* Step item */}
                  <div
                    onClick={() => done && setStep(s.n)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: done ? 'pointer' : 'default', flexShrink: 0 }}
                  >
                    {/* Circle */}
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
                    {/* Label */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: active ? tk.text : done ? tk.success : tk.textMuted, transition: 'color 0.2s' }}>
                        {s.label}
                      </span>
                      <span style={{ fontSize: '11px', color: tk.textMuted }}>
                        {s.desc}
                      </span>
                    </div>
                  </div>

                  {/* Connector */}
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

        {/* ── Main form card ── */}
        <div style={{
          background: tk.surface, border: `1px solid ${tk.border}`,
          borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow,
        }}>
          {/* Card header */}
          <div style={{
            padding: '20px 24px', borderBottom: `1px solid ${tk.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text, letterSpacing: '-0.01em' }}>
                {STEPS[step - 1].label}
              </div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>
                {step === 1 && 'Preencha as informações básicas do produto.'}
                {step === 2 && 'Informe os dados fiscais obrigatórios para emissão de notas.'}
                {step === 3 && 'Associe o produto a uma categoria existente ou crie uma nova.'}
              </div>
            </div>
            <span style={{ fontSize: '11.5px', color: tk.textMuted, background: tk.chipBg, padding: '4px 10px', borderRadius: '20px' }}>
              Etapa {step} de {STEPS.length}
            </span>
          </div>

          {/* Error */}
          {formError && (
            <div style={{
              margin: '16px 24px 0',
              padding: '11px 14px', background: tk.errorBg,
              border: `1px solid ${tk.errorBorder}`,
              borderRadius: '8px', fontSize: '13px', color: tk.error, fontWeight: '500',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {formError}
              <button onClick={() => setFormError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tk.error, display: 'flex' }}>{Ic.x}</button>
            </div>
          )}

          {/* Form body */}
          <div style={{ padding: '24px' }}>

            {/* Step 1 — Produto */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Nome do produto *" tk={tk}>
                    <Input value={name} onChange={setName} placeholder="Ex: Camiseta Básica Branca" tk={tk} />
                  </Field>
                  <Field label="SKU / Código interno *" tk={tk}>
                    <Input value={sku} onChange={setSku} placeholder="Ex: CAM-001-BRA" tk={tk} />
                  </Field>
                </div>

                <Field label="Código de barras" tk={tk}>
                  <Input value={barcode} onChange={setBarcode} placeholder="EAN-13 ou GTIN" tk={tk} />
                </Field>

                <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Estoque inicial *" tk={tk}>
                    <Input value={stock} onChange={setStock} placeholder="0" type="number" tk={tk} />
                  </Field>
                  <Field label="Preço de venda (R$) *" tk={tk}>
                    <Input value={price} onChange={setPrice} placeholder="0.00" type="number" tk={tk} />
                  </Field>
                </div>

                {/* Image upload */}
                <Field label="Imagem do produto" tk={tk}>
                  <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', padding: '24px 16px',
                      background: tk.inputMuted,
                      border: `2px dashed ${tk.border}`, borderRadius: '10px',
                      cursor: 'pointer', transition: 'border-color 0.15s',
                      minHeight: '120px',
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = tk.accent)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = tk.border)}
                    >
                      <span style={{ color: tk.textMuted }}>{Ic.image}</span>
                      <span style={{ fontSize: '12.5px', color: tk.textSub, textAlign: 'center' }}>
                        {imageFile ? imageFile.name : 'Clique para selecionar'}
                      </span>
                      <span style={{ fontSize: '11px', color: tk.textMuted }}>PNG, JPG ou WEBP</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                    </label>

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: tk.inputMuted,
                      border: `1px solid ${tk.border}`, borderRadius: '10px',
                      overflow: 'hidden', minHeight: '120px',
                    }}>
                      {imagePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '12px', color: tk.textMuted }}>Prévia da imagem</span>
                      )}
                    </div>
                  </div>
                </Field>
              </div>
            )}

            {/* Step 2 — Fiscal */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Field label="Tipo de tributação *" hint="Selecione como o produto será tributado" tk={tk}>
                  <Select value={taxType} onChange={setTaxType} options={TAX_TYPE_OPTIONS} placeholder="Selecione o tipo" tk={tk} />
                </Field>

                <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="NCM *" hint="Obrigatório — 8 dígitos numéricos" tk={tk}>
                    <Input
                      value={ncm}
                      onChange={setNcm}
                      placeholder="00000000"
                      tk={tk}
                      error={ncm.length > 0 && !isValidNcm}
                    />
                    {ncm.length > 0 && !isValidNcm && (
                      <span style={{ fontSize: '11.5px', color: tk.error }}>NCM deve ter exatamente 8 dígitos</span>
                    )}
                  </Field>
                  <Field label="CEST" hint="Opcional — obrigatório apenas para ICMS-ST" tk={tk}>
                    <Input
                      value={cest}
                      onChange={setCest}
                      placeholder="0000000"
                      tk={tk}
                      error={cest.length > 0 && !isValidCest}
                    />
                    {cest.length > 0 && !isValidCest && (
                      <span style={{ fontSize: '11.5px', color: tk.error }}>CEST deve ter exatamente 7 dígitos</span>
                    )}
                  </Field>
                </div>

                <Field label="Origem do produto *" tk={tk}>
                  <Select value={origin} onChange={setOrigin} options={ORIGIN_OPTIONS} placeholder="Selecione a origem" tk={tk} />
                </Field>

                {/* Info box */}
                <div style={{
                  padding: '12px 16px', background: tk.accentBg,
                  border: `1px solid ${tk.border}`,
                  borderRadius: '9px', display: 'flex', gap: '10px', alignItems: 'flex-start',
                }}>
                  <span style={{ color: tk.accent, marginTop: '1px', flexShrink: 0 }}>{Ic.info}</span>
                  <span style={{ fontSize: '12.5px', color: tk.accentText, lineHeight: 1.5 }}>
                    O NCM (Nomenclatura Comum do Mercosul) é obrigatório para todos os produtos. O CEST só deve ser informado quando o produto estiver sujeito ao regime de substituição tributária (ICMS-ST).
                  </span>
                </div>
              </div>
            )}

            {/* Step 3 — Categoria */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Field label="Categoria *" hint="Selecione uma existente ou digite para criar uma nova" tk={tk}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                        color: tk.textMuted, display: 'flex', pointerEvents: 'none',
                      }}>
                        {Ic.search}
                      </span>
                      <input
                        value={categoryQuery}
                        placeholder="Buscar ou criar categoria..."
                        onChange={(e) => { setCategoryQuery(e.target.value); setCategoryId(null); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        style={{
                          width: '100%', padding: '10px 13px 10px 36px',
                          background: tk.inputBg, border: `1px solid ${tk.inputBorder}`,
                          borderRadius: '8px', fontSize: '13.5px', color: tk.text,
                          fontFamily: 'var(--np-font)', outline: 'none',
                        }}
                      />
                    </div>

                    {showSuggestions && filteredCategories.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        marginTop: '4px', background: tk.surface,
                        border: `1px solid ${tk.border}`, borderRadius: '10px',
                        boxShadow: tk.shadowHover, zIndex: 10, overflow: 'hidden',
                        maxHeight: '200px', overflowY: 'auto',
                      }}>
                        {filteredCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => { setCategoryQuery(cat.name); setCategoryId(cat.id); setShowSuggestions(false); }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '10px 14px', background: 'none', border: 'none',
                              cursor: 'pointer', fontSize: '13.5px', color: tk.text,
                              fontFamily: 'var(--np-font)', transition: 'background 0.1s',
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = tk.surfaceHover)}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>

                {/* New category badge */}
                {categoryQuery && !categoryId && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', background: tk.successBg,
                    border: `1px solid ${tk.successBorder}`,
                    borderRadius: '20px', width: 'fit-content',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tk.success, display: 'inline-block' }} />
                    <span style={{ fontSize: '12.5px', color: tk.success, fontWeight: '500' }}>
                      Nova categoria: &quot;{categoryQuery}&quot; será criada automaticamente
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form actions */}
          <div style={{
            padding: '16px 24px', borderTop: `1px solid ${tk.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 16px', background: 'none',
                    border: `1px solid ${tk.border}`, borderRadius: '8px',
                    color: tk.textSub, cursor: 'pointer', fontSize: '13.5px',
                    fontFamily: 'var(--np-font)', transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = tk.borderFocus; (e.currentTarget as HTMLButtonElement).style.color = tk.text; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = tk.border; (e.currentTarget as HTMLButtonElement).style.color = tk.textSub; }}
                >
                  {Ic.arrowLeft} Voltar
                </button>
              )}
            </div>

            <div>
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 ? !canContinueProduct : !canContinueFiscal}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '9px 18px',
                    background: (step === 1 ? canContinueProduct : canContinueFiscal) ? tk.accent : tk.disabledBg,
                    color: (step === 1 ? canContinueProduct : canContinueFiscal) ? '#fff' : tk.textMuted,
                    border: 'none', borderRadius: '8px', cursor: (step === 1 ? canContinueProduct : canContinueFiscal) ? 'pointer' : 'not-allowed',
                    fontSize: '13.5px', fontWeight: '600', fontFamily: 'var(--np-font)',
                    transition: 'all 0.15s',
                  }}
                >
                  Próxima etapa {Ic.arrow}
                </button>
              ) : (
                <button
                  onClick={createProduct}
                  disabled={!canContinueCategory || saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '9px 18px',
                    background: canContinueCategory && !saving ? tk.accent : tk.disabledBg,
                    color: canContinueCategory && !saving ? '#fff' : tk.textMuted,
                    border: 'none', borderRadius: '8px',
                    cursor: canContinueCategory && !saving ? 'pointer' : 'not-allowed',
                    fontSize: '13.5px', fontWeight: '600', fontFamily: 'var(--np-font)',
                    transition: 'all 0.15s', opacity: saving ? 0.7 : 1,
                  }}
                >
                  {Ic.save} {saving ? 'Salvando...' : 'Salvar produto'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Summary card ── */}
        <div style={{
          background: tk.surface, border: `1px solid ${tk.border}`,
          borderRadius: '12px', padding: '18px 24px', boxShadow: tk.shadow,
        }}>
          <div style={{ fontSize: '12.5px', fontWeight: '600', color: tk.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Resumo
          </div>
          <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {[
              ['Produto', name || '—'],
              ['SKU', sku || '—'],
              ['Preço', price ? `R$ ${Number(price).toFixed(2)}` : '—'],
              ['Estoque', stock || '—'],
              ['Tributação', taxType || '—'],
              ['NCM', ncm || '—'],
              ['Origem', origin !== '' ? originLabel(Number(origin)).split(' - ')[0] : '—'],
              ['Categoria', categoryQuery || '—'],
              ['Código de barras', barcode || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: tk.textMuted, minWidth: '90px', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: '13px', color: tk.text, fontWeight: value !== '—' ? '500' : '400' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
