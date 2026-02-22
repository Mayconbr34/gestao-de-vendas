'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

/* ─── Types ─────────────────────────────────────────────── */

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  ncm?: string | null;
  cest?: string | null;
};

type Company = {
  id: string;
  tradeName: string;
};

type ResolveResult = {
  mode: string;
  cst?: string | null;
  csosn?: string | null;
  icmsRate?: number | null;
  mvaRate?: number | null;
  stReduction?: number | null;
  stRate?: number | null;
  reason?: string | null;
  ruleId?: string | null;
  ruleDescription?: string | null;
};

const Ic = {
  spark: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  box: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4A2 2 0 0 0 13 22l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

function tokens() {
  return {
    bg: 'var(--bg)',
    surface: 'var(--card)',
    surfaceAlt: 'var(--surface)',
    border: 'var(--border)',
    borderFocus: 'var(--accent)',
    text: 'var(--ink)',
    textSub: 'var(--muted)',
    textMuted: 'var(--muted)',
    accent: 'var(--accent)',
    accentText: 'var(--accent-dark)',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.12)',
    errorBorder: 'rgba(239, 68, 68, 0.28)',
    inputBg: 'var(--card)',
    inputBorder: 'var(--border)',
    shadow: 'var(--shadow)',
    chipBg: 'var(--sidebar-active-bg)',
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
      {hint ? <span style={{ fontSize: '11.5px', color: tk.textMuted }}>{hint}</span> : null}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  tk,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  tk: ReturnType<typeof tokens>;
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
        border: `1px solid ${focused ? tk.borderFocus : tk.inputBorder}`,
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
  options: { value: string; label: string }[];
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
      }}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function SimuladorPage() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [uf, setUf] = useState('');
  const [regime, setRegime] = useState<'NORMAL' | 'SIMPLES'>('NORMAL');
  const [productId, setProductId] = useState('');
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [message, setMessage] = useState('');

  const tk = useMemo(() => tokens(), []);

  const loadProducts = async (companyFilter?: string) => {
    if (!token) return;
    const query =
      user?.role === 'SUPER_ADMIN' && companyFilter
        ? `?companyId=${companyFilter}`
        : '';
    const data = await apiRequest<Product[]>(`/products${query}`, {}, token);
    setProducts(data);
  };

  const loadCompanies = async () => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    const data = await apiRequest<Company[]>('/companies', {}, token);
    setCompanies(data);
  };

  useEffect(() => {
    loadProducts(user?.role === 'SUPER_ADMIN' ? companyId : undefined);
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, companyId, user?.role]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      setProductId('');
      setResult(null);
    }
  }, [companyId, user?.role]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === productId) || null,
    [products, productId]
  );

  const runSimulation = async () => {
    if (!token) return;
    setMessage('');
    setResult(null);
    try {
      if (user?.role === 'SUPER_ADMIN' && !companyId) {
        setMessage('Selecione a empresa.');
        return;
      }
      if (!/^[A-Za-z]{2}$/.test(uf.trim())) {
        setMessage('Informe UF com 2 letras.');
        return;
      }
      if (!selectedProduct) {
        setMessage('Selecione um produto.');
        return;
      }
      const payload = {
        uf: uf.trim().toUpperCase(),
        regime,
        companyId: user?.role === 'SUPER_ADMIN' ? companyId || undefined : undefined
      };
      const data = await apiRequest<ResolveResult>(
        '/fiscal-rules/resolve',
        { method: 'POST', body: JSON.stringify(payload) },
        token
      );
      setResult(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao simular regra');
    }
  };

  const companyOptions = companies.map((company) => ({ value: company.id, label: company.tradeName }));

  const displayValue = result?.mode ? result.mode : 'Aguardando';
  const displayCode = result?.cst || result?.csosn || '--';

  return (
    <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --np-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }
        .calc-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr); gap: 16px; align-items: start; }
        .calc-screen {
          padding: 16px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: linear-gradient(145deg, var(--card), var(--surface));
          box-shadow: var(--shadow);
          display: grid;
          gap: 6px;
        }
        .calc-key {
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          padding: 10px;
          display: grid;
          gap: 4px;
          min-height: 64px;
        }
        .calc-key span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); }
        .calc-key strong { font-size: 12.5px; color: var(--ink); font-weight: 600; }
        @media (max-width: 1100px) { .calc-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>Simulador fiscal</h1>
          <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Simule o modo fiscal e alíquotas por UF e regime.</p>
        </div>

        {message ? <div className="message" style={{ margin: 0 }}>{message}</div> : null}

        <div className="calc-grid">
          <section style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '16px', padding: '18px', boxShadow: tk.shadow, display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tk.textSub, fontSize: '12px' }}>
              {Ic.spark}
              <span>Calculadora fiscal: preencha os dados e simule.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {user?.role === 'SUPER_ADMIN' ? (
                <Field label="Empresa" tk={tk}>
                  <Select
                    value={companyId}
                    onChange={setCompanyId}
                    options={companyOptions}
                    placeholder="Selecione"
                    tk={tk}
                  />
                </Field>
              ) : null}
              <Field label="UF destino" tk={tk}>
                <Input value={uf} onChange={setUf} placeholder="Ex: SP" tk={tk} />
              </Field>
              <Field label="Regime" tk={tk}>
                <Select
                  value={regime}
                  onChange={(v) => setRegime(v as 'NORMAL' | 'SIMPLES')}
                  options={[
                    { value: 'NORMAL', label: 'NORMAL' },
                    { value: 'SIMPLES', label: 'SIMPLES' },
                  ]}
                  tk={tk}
                />
              </Field>
              <Field label="Produto" tk={tk}>
                <Select
                  value={productId}
                  onChange={setProductId}
                  options={products.map((product) => ({
                    value: product.id,
                    label: `${product.sku ? `${product.sku} · ` : ''}${product.name}`
                  }))}
                  placeholder="Selecione"
                  tk={tk}
                />
              </Field>
            </div>

            {selectedProduct ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ background: tk.chipBg, color: tk.accentText, borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '600' }}>
                  NCM {selectedProduct.ncm || '-'}
                </span>
                <span style={{ background: tk.surfaceAlt, color: tk.textSub, borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '600' }}>
                  CEST {selectedProduct.cest || '-'}
                </span>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={runSimulation}
                style={{
                  padding: '10px 18px',
                  background: tk.accent,
                  border: `1px solid ${tk.accent}`,
                  color: '#fff',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  fontFamily: 'var(--np-font)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Simular
              </button>
            </div>
          </section>

          <section style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '16px', padding: '18px', boxShadow: tk.shadow, display: 'grid', gap: '16px' }}>
            <div className="calc-screen">
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: tk.textSub }}>
                Display fiscal
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: tk.text, letterSpacing: '-0.02em' }}>{displayValue}</div>
              <div style={{ fontSize: '12px', color: tk.textSub, fontVariantNumeric: 'tabular-nums' }}>Código: {displayCode}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
              <div className="calc-key">
                <span>UF</span>
                <strong>{uf || '--'}</strong>
              </div>
              <div className="calc-key">
                <span>Regime</span>
                <strong>{regime}</strong>
              </div>
              <div className="calc-key">
                <span>Produto</span>
                <strong>{selectedProduct ? selectedProduct.name : '--'}</strong>
              </div>
              <div className="calc-key">
                <span>NCM</span>
                <strong>{selectedProduct?.ncm || '--'}</strong>
              </div>
              <div className="calc-key">
                <span>ICMS</span>
                <strong>{result?.icmsRate !== null && result?.icmsRate !== undefined ? `${Number(result.icmsRate).toFixed(2)}%` : '--'}</strong>
              </div>
              <div className="calc-key">
                <span>ICMS-ST</span>
                <strong>{result?.stRate !== null && result?.stRate !== undefined ? `${Number(result.stRate).toFixed(2)}%` : '--'}</strong>
              </div>
            </div>

            {result ? (
              <div style={{ fontSize: '12.5px', color: tk.textSub }}>
                Regra aplicada: {result.ruleDescription || result.ruleId || '-'}
              </div>
            ) : (
              <div style={{ fontSize: '12.5px', color: tk.textSub }}>Nenhum resultado ainda.</div>
            )}
          </section>
        </div>

        {!result ? (
          <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: `1px dashed ${tk.border}`, borderRadius: '14px', background: tk.surfaceAlt }}>
            <span style={{ color: tk.textSub }}>{Ic.box}</span>
            <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Pronto para simular</div>
            <div style={{ fontSize: '13px', color: tk.textSub }}>Selecione UF, regime e produto para visualizar a regra aplicada.</div>
          </div>
        ) : (
          <section style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '16px', padding: '18px', boxShadow: tk.shadow, display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Detalhes do calculo</div>
                <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '4px' }}>Informacoes completas da regra aplicada.</div>
              </div>
              <span style={{ background: tk.chipBg, color: tk.accentText, borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '600' }}>{result.mode}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: tk.surfaceAlt }}>
                <div style={{ fontSize: '11px', color: tk.textSub, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Codigo fiscal</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text, marginTop: '6px' }}>{displayCode}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', background: tk.surfaceAlt }}>
                <div style={{ fontSize: '11px', color: tk.textSub, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ICMS</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text, marginTop: '6px' }}>
                  {result.icmsRate !== null && result.icmsRate !== undefined ? `${Number(result.icmsRate).toFixed(2)}%` : '-'}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', background: tk.surfaceAlt }}>
                <div style={{ fontSize: '11px', color: tk.textSub, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MVA</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text, marginTop: '6px' }}>
                  {result.mvaRate !== null && result.mvaRate !== undefined ? `${Number(result.mvaRate).toFixed(2)}%` : '-'}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', background: tk.surfaceAlt }}>
                <div style={{ fontSize: '11px', color: tk.textSub, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ICMS-ST</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text, marginTop: '6px' }}>
                  {result.stRate !== null && result.stRate !== undefined ? `${Number(result.stRate).toFixed(2)}%` : '-'}
                </div>
              </div>
            </div>
            {result.stReduction !== null && result.stReduction !== undefined ? (
              <div style={{ fontSize: '12.5px', color: tk.textSub }}>Reducao base ST: {Number(result.stReduction).toFixed(2)}%</div>
            ) : null}
            {result.reason ? (
              <div style={{ fontSize: '12.5px', color: tk.textSub }}>Motivo: {result.reason}</div>
            ) : null}
          </section>
        )}
      </div>
    </div>
  );
}
