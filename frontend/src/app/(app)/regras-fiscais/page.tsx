'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

/* ─── Types ─────────────────────────────────────────────── */

type FiscalRule = {
  id: string;
  uf: string;
  regime: 'SIMPLES' | 'NORMAL';
  mode: 'TRIBUTADO' | 'ICMS_ST' | 'ISENTO';
  cst?: string | null;
  csosn?: string | null;
  icmsRate?: number | null;
  mvaRate?: number | null;
  stReduction?: number | null;
  stRate?: number | null;
  reason?: string | null;
  priority: number;
  description?: string | null;
  companyId?: string | null;
};

type Company = {
  id: string;
  tradeName: string;
};

const DEFAULT_CODES = {
  NORMAL: {
    TRIBUTADO: '00',
    ICMS_ST: '60',
    ISENTO: '40'
  },
  SIMPLES: {
    TRIBUTADO: '102',
    ICMS_ST: '500',
    ISENTO: '400'
  }
} as const;

const Ic = {
  plus: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  box: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4A2 2 0 0 0 13 22l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

function Textarea({
  value,
  onChange,
  placeholder,
  tk,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tk: ReturnType<typeof tokens>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      rows={3}
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
        resize: 'vertical',
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

export default function RegrasFiscaisPage() {
  const { token, user } = useAuth();
  const [rules, setRules] = useState<FiscalRule[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState<FiscalRule | null>(null);

  const [uf, setUf] = useState('');
  const [regime, setRegime] = useState<'SIMPLES' | 'NORMAL'>('NORMAL');
  const [mode, setMode] = useState<'TRIBUTADO' | 'ICMS_ST' | 'ISENTO'>('TRIBUTADO');
  const [cst, setCst] = useState<string>(DEFAULT_CODES.NORMAL.TRIBUTADO);
  const [csosn, setCsosn] = useState<string>('');
  const [icmsRate, setIcmsRate] = useState('');
  const [mvaRate, setMvaRate] = useState('');
  const [stReduction, setStReduction] = useState('');
  const [stRate, setStRate] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('100');
  const [description, setDescription] = useState('');

  const tk = useMemo(() => tokens(), []);

  const loadRules = async () => {
    if (!token) return;
    const data = await apiRequest<FiscalRule[]>('/fiscal-rules', {}, token);
    setRules(data);
  };

  const loadCompanies = async () => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    const data = await apiRequest<Company[]>('/companies', {}, token);
    setCompanies(data);
  };

  useEffect(() => {
    loadRules();
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetForm = () => {
    setUf('');
    setRegime('NORMAL');
    setMode('TRIBUTADO');
    setCst(DEFAULT_CODES.NORMAL.TRIBUTADO);
    setCsosn('');
    setIcmsRate('');
    setMvaRate('');
    setStReduction('');
    setStRate('');
    setReason('');
    setPriority('100');
    setDescription('');
    setCompanyId('');
    setEditing(null);
    setFormError('');
  };

  const openEdit = (item: FiscalRule) => {
    setEditing(item);
    setUf(item.uf);
    setRegime(item.regime);
    setMode(item.mode);
    setCst(item.cst || DEFAULT_CODES.NORMAL[item.mode]);
    setCsosn(item.csosn || DEFAULT_CODES.SIMPLES[item.mode]);
    setIcmsRate(item.icmsRate !== null && item.icmsRate !== undefined ? String(item.icmsRate) : '');
    setMvaRate(item.mvaRate !== null && item.mvaRate !== undefined ? String(item.mvaRate) : '');
    setStReduction(item.stReduction !== null && item.stReduction !== undefined ? String(item.stReduction) : '');
    setStRate(item.stRate !== null && item.stRate !== undefined ? String(item.stRate) : '');
    setReason(item.reason || '');
    setPriority(String(item.priority || 100));
    setDescription(item.description || '');
    setCompanyId(item.companyId || '');
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegimeChange = (value: 'SIMPLES' | 'NORMAL') => {
    setRegime(value);
    if (value === 'NORMAL') {
      setCst(DEFAULT_CODES.NORMAL[mode]);
      setCsosn('');
    } else {
      setCsosn(DEFAULT_CODES.SIMPLES[mode]);
      setCst('');
    }
  };

  const handleModeChange = (value: 'TRIBUTADO' | 'ICMS_ST' | 'ISENTO') => {
    setMode(value);
    if (regime === 'NORMAL') {
      setCst(DEFAULT_CODES.NORMAL[value]);
    } else {
      setCsosn(DEFAULT_CODES.SIMPLES[value]);
    }
  };

  const saveRule = async () => {
    if (!token) return;
    setFormError('');
    setMessage('');
    try {
      if (user?.role === 'SUPER_ADMIN' && !companyId) {
        setFormError('Selecione a empresa.');
        return;
      }
      if (!/^[A-Za-z]{2}$/.test(uf.trim())) {
        setFormError('UF deve ter 2 letras.');
        return;
      }
      if (mode === 'ISENTO' && !reason.trim()) {
        setFormError('Informe o motivo da isenção.');
        return;
      }
      if (mode === 'ICMS_ST' && !mvaRate) {
        setFormError('Informe o MVA para ICMS-ST.');
        return;
      }

      const payload = {
        uf: uf.trim().toUpperCase(),
        regime,
        mode,
        cst: regime === 'NORMAL' ? cst || undefined : undefined,
        csosn: regime === 'SIMPLES' ? csosn || undefined : undefined,
        icmsRate: icmsRate ? Number(icmsRate) : undefined,
        mvaRate: mvaRate ? Number(mvaRate) : undefined,
        stReduction: stReduction ? Number(stReduction) : undefined,
        stRate: stRate ? Number(stRate) : undefined,
        reason: reason.trim() || undefined,
        priority: priority ? Number(priority) : 100,
        description: description.trim() || undefined
      };

      if (editing) {
        await apiRequest(`/fiscal-rules/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
        setMessage('Regra atualizada.');
      } else {
        await apiRequest(
          '/fiscal-rules',
          {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              companyId: user?.role === 'SUPER_ADMIN' ? companyId || undefined : undefined
            })
          },
          token
        );
        setMessage('Regra criada.');
      }

      resetForm();
      await loadRules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar regra');
    }
  };

  const removeRule = async (id: string) => {
    if (!token) return;
    setMessage('');
    try {
      await apiRequest(`/fiscal-rules/${id}`, { method: 'DELETE' }, token);
      setMessage('Regra removida.');
      await loadRules();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao remover regra');
    }
  };

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPANY_ADMIN') {
    return (
      <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)' }}>
        <div style={{ padding: '24px', background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px' }}>
          <strong style={{ color: tk.text }}>Regras fiscais</strong>
          <p style={{ color: tk.textSub, marginTop: '6px' }}>Sem permissão para acessar.</p>
        </div>
      </div>
    );
  }

  const companyLabel = (id?: string | null) => {
    if (!id) return '-';
    return companies.find((item) => item.id === id)?.tradeName || id;
  };

  const companyOptions = companies.map((company) => ({ value: company.id, label: company.tradeName }));

  const modePill = (value: FiscalRule['mode']) => {
    const styles: Record<FiscalRule['mode'], { bg: string; color: string }> = {
      TRIBUTADO: { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' },
      ICMS_ST: { bg: 'rgba(245, 158, 11, 0.18)', color: '#b45309' },
      ISENTO: { bg: 'rgba(148, 163, 184, 0.2)', color: '#475569' },
    };
    const style = styles[value];
    return (
      <span style={{ padding: '4px 10px', borderRadius: '999px', background: style.bg, color: style.color, fontSize: '11px', fontWeight: '600' }}>
        {value}
      </span>
    );
  };

  return (
    <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --np-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }
        .pl-table-wrap { -webkit-overflow-scrolling: touch; }
        .pl-tr:hover { background: var(--surface) !important; }
        @media (max-width: 900px) {
          .pl-table { display: none !important; }
          .pl-cards { display: grid !important; }
        }
      `}</style>

      <div style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>Regras fiscais</h1>
            <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>
              Configure regras por UF, regime e prioridade para tributacao automatizada.
            </p>
          </div>
          <button
            onClick={resetForm}
            style={{
              padding: '9px 16px',
              background: tk.accent,
              color: '#fff',
              borderRadius: '8px',
              border: `1px solid ${tk.accent}`,
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'var(--np-font)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {Ic.plus} Nova regra
          </button>
        </div>

        {message ? <div className="message" style={{ margin: 0 }}>{message}</div> : null}

        <section style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '16px', padding: '18px', boxShadow: tk.shadow, display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>{editing ? 'Editar regra fiscal' : 'Nova regra fiscal'}</div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '4px' }}>Defina o modo fiscal, codigos e percentuais.</div>
            </div>
            {editing ? (
              <span style={{ background: tk.chipBg, color: tk.accentText, borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '600' }}>
                Editando
              </span>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: tk.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Dados basicos
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
                  <Input value={uf} onChange={setUf} placeholder="Ex: SP" tk={tk} error={!!formError && !uf} />
                </Field>
                <Field label="Regime" tk={tk}>
                  <Select
                    value={regime}
                    onChange={(v) => handleRegimeChange(v as 'SIMPLES' | 'NORMAL')}
                    options={[
                      { value: 'NORMAL', label: 'NORMAL' },
                      { value: 'SIMPLES', label: 'SIMPLES' },
                    ]}
                    tk={tk}
                  />
                </Field>
                <Field label="Modo fiscal" tk={tk}>
                  <Select
                    value={mode}
                    onChange={(v) => handleModeChange(v as 'TRIBUTADO' | 'ICMS_ST' | 'ISENTO')}
                    options={[
                      { value: 'TRIBUTADO', label: 'TRIBUTADO' },
                      { value: 'ICMS_ST', label: 'ICMS-ST' },
                      { value: 'ISENTO', label: 'ISENTO' },
                    ]}
                    tk={tk}
                  />
                </Field>
                <Field label="Prioridade" tk={tk}>
                  <Input value={priority} onChange={setPriority} placeholder="Ex: 100" type="number" tk={tk} />
                </Field>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: tk.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Codigos fiscais
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {regime === 'NORMAL' ? (
                  <Field label="CST" tk={tk}>
                    <Input value={cst} onChange={setCst} placeholder="CST" tk={tk} />
                  </Field>
                ) : (
                  <Field label="CSOSN" tk={tk}>
                    <Input value={csosn} onChange={setCsosn} placeholder="CSOSN" tk={tk} />
                  </Field>
                )}
                <Field label="Descricao" tk={tk} hint="Opcional">
                  <Input value={description} onChange={setDescription} placeholder="Descricao curta" tk={tk} />
                </Field>
              </div>
            </div>

            {mode === 'TRIBUTADO' ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: tk.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Tributado
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <Field label="ICMS (%)" tk={tk} hint="Opcional">
                    <Input value={icmsRate} onChange={setIcmsRate} placeholder="Ex: 18" type="number" tk={tk} />
                  </Field>
                </div>
              </div>
            ) : null}

            {mode === 'ICMS_ST' ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: tk.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  ICMS-ST
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <Field label="MVA (%)" tk={tk}>
                    <Input value={mvaRate} onChange={setMvaRate} placeholder="Ex: 40" type="number" tk={tk} error={!!formError && !mvaRate} />
                  </Field>
                  <Field label="Reducao base ST (%)" tk={tk} hint="Opcional">
                    <Input value={stReduction} onChange={setStReduction} placeholder="Ex: 10" type="number" tk={tk} />
                  </Field>
                  <Field label="ICMS-ST (%)" tk={tk} hint="Opcional">
                    <Input value={stRate} onChange={setStRate} placeholder="Ex: 18" type="number" tk={tk} />
                  </Field>
                </div>
              </div>
            ) : null}

            {mode === 'ISENTO' ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: tk.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Isencao
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <Field label="Motivo/justificativa" tk={tk}>
                    <Textarea value={reason} onChange={setReason} placeholder="Explique o motivo da isencao" tk={tk} />
                  </Field>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={saveRule}
              style={{
                padding: '9px 16px',
                background: tk.accent,
                border: `1px solid ${tk.accent}`,
                color: '#fff',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'var(--np-font)'
              }}
            >
              {editing ? 'Salvar alterações' : 'Salvar regra'}
            </button>
            {editing ? (
              <button
                onClick={resetForm}
                style={{
                  padding: '9px 16px',
                  background: 'transparent',
                  border: `1px solid ${tk.border}`,
                  color: tk.textSub,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  fontFamily: 'var(--np-font)'
                }}
              >
                Cancelar edicao
              </button>
            ) : null}
          </div>

          {formError ? <div className="message error" style={{ margin: 0 }}>{formError}</div> : null}
        </section>

        <div className="pl-table-wrap" style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: tk.shadow }}>
          {rules.length === 0 ? (
            <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: tk.textSub }}>{Ic.box}</span>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Nenhuma regra cadastrada</div>
              <div style={{ fontSize: '13px', color: tk.textSub }}>Crie a primeira regra para automatizar a tributacao.</div>
            </div>
          ) : (
            <>
              <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tk.surfaceAlt}` }}>
                    {(
                      [
                        { label: 'UF', width: '90px' },
                        { label: 'Regime', width: '120px' },
                        { label: 'Modo', width: '140px' },
                        { label: 'Codigo', width: '130px' },
                        { label: 'ICMS', width: '110px' },
                        { label: 'MVA', width: '110px' },
                        { label: 'ST', width: '110px' },
                        { label: 'Prioridade', width: '120px' },
                        { label: 'Descricao', width: '220px' },
                        { label: 'Empresa', width: '200px' },
                        { label: 'Acoes', width: '180px' },
                      ] as { label: string; width: string }[]
                    )
                      .filter((col) => (col.label === 'Empresa' ? user?.role === 'SUPER_ADMIN' : true))
                      .map(({ label, width }, i) => (
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
                  {rules.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="pl-tr"
                      style={{
                        borderBottom: idx < rules.length - 1 ? `1px solid ${tk.surfaceAlt}` : 'none',
                        background: tk.surface,
                        transition: 'background 0.12s',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: tk.text }}>{item.uf}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.regime}</td>
                      <td style={{ padding: '10px 14px' }}>{modePill(item.mode)}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.regime === 'NORMAL' ? item.cst || '-' : item.csosn || '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.icmsRate !== null && item.icmsRate !== undefined ? `${Number(item.icmsRate).toFixed(2)}%` : '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.mvaRate !== null && item.mvaRate !== undefined ? `${Number(item.mvaRate).toFixed(2)}%` : '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.stRate !== null && item.stRate !== undefined ? `${Number(item.stRate).toFixed(2)}%` : '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.priority}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.description || '-'}</td>
                      {user?.role === 'SUPER_ADMIN' ? (
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{companyLabel(item.companyId)}</td>
                      ) : null}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => openEdit(item)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: `1px solid ${tk.border}`,
                              background: 'transparent',
                              color: tk.textSub,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {Ic.edit} Editar
                          </button>
                          <button
                            onClick={() => removeRule(item.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: `1px solid ${tk.errorBorder}`,
                              background: tk.errorBg,
                              color: tk.error,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {Ic.trash} Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pl-cards" style={{ display: 'none', gap: '12px', padding: '16px' }}>
                {rules.map((item) => (
                  <div key={item.id} style={{ border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '12px', display: 'grid', gap: '8px', background: tk.surface }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: tk.text }}>{item.uf} · {item.regime}</div>
                      {modePill(item.mode)}
                    </div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Codigo: {item.regime === 'NORMAL' ? item.cst || '-' : item.csosn || '-'}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Prioridade: {item.priority}</div>
                    {item.description ? <div style={{ fontSize: '12px', color: tk.textSub }}>{item.description}</div> : null}
                    {user?.role === 'SUPER_ADMIN' ? (
                      <div style={{ fontSize: '12px', color: tk.textSub }}>Empresa: {companyLabel(item.companyId)}</div>
                    ) : null}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openEdit(item)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: `1px solid ${tk.border}`,
                          background: 'transparent',
                          color: tk.textSub,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {Ic.edit} Editar
                      </button>
                      <button
                        onClick={() => removeRule(item.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: `1px solid ${tk.errorBorder}`,
                          background: tk.errorBg,
                          color: tk.error,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {Ic.trash} Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
