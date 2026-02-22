'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

/* ─── Types ─────────────────────────────────────────────── */

type IcmsRate = {
  id: string;
  uf: string;
  rate: number;
  startDate: string;
  endDate?: string | null;
  companyId?: string | null;
};

type Company = {
  id: string;
  tradeName: string;
};

/* ─── Helpers ───────────────────────────────────────────── */

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
};

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

export default function AliquotasPage() {
  const { token, user } = useAuth();
  const [rates, setRates] = useState<IcmsRate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState<IcmsRate | null>(null);

  const [uf, setUf] = useState('');
  const [rate, setRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const tk = useMemo(() => tokens(), []);

  const loadRates = async () => {
    if (!token) return;
    const data = await apiRequest<IcmsRate[]>('/icms-rates', {}, token);
    setRates(data);
  };

  const loadCompanies = async () => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    const data = await apiRequest<Company[]>('/companies', {}, token);
    setCompanies(data);
  };

  useEffect(() => {
    loadRates();
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetForm = () => {
    setUf('');
    setRate('');
    setStartDate('');
    setEndDate('');
    setCompanyId('');
    setEditing(null);
    setFormError('');
  };

  const openEdit = (item: IcmsRate) => {
    setEditing(item);
    setUf(item.uf);
    setRate(String(item.rate));
    setStartDate(item.startDate?.slice(0, 10) || '');
    setEndDate(item.endDate?.slice(0, 10) || '');
    setCompanyId(item.companyId || '');
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveRate = async () => {
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
      if (!startDate) {
        setFormError('Informe a data de início.');
        return;
      }
      if (!rate || Number.isNaN(Number(rate))) {
        setFormError('Informe uma alíquota válida.');
        return;
      }

      const payload = {
        uf: uf.trim().toUpperCase(),
        rate: Number(rate),
        startDate,
        endDate: endDate || undefined
      };

      if (editing) {
        await apiRequest(`/icms-rates/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
        setMessage('Alíquota atualizada.');
      } else {
        await apiRequest(
          '/icms-rates',
          {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              companyId: user?.role === 'SUPER_ADMIN' ? companyId || undefined : undefined
            })
          },
          token
        );
        setMessage('Alíquota criada.');
      }

      resetForm();
      await loadRates();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar alíquota');
    }
  };

  const removeRate = async (id: string) => {
    if (!token) return;
    setMessage('');
    try {
      await apiRequest(`/icms-rates/${id}`, { method: 'DELETE' }, token);
      setMessage('Alíquota removida.');
      await loadRates();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao remover alíquota');
    }
  };

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPANY_ADMIN') {
    return (
      <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)' }}>
        <div style={{ padding: '24px', background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px' }}>
          <strong style={{ color: tk.text }}>Alíquotas UF</strong>
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
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>Alíquotas UF</h1>
            <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>
              Cadastre alíquotas internas por UF e vigência.
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
            {Ic.plus} Nova alíquota
          </button>
        </div>

        {message ? <div className="message" style={{ margin: 0 }}>{message}</div> : null}

        <section style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '16px', padding: '18px', boxShadow: tk.shadow, display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>{editing ? 'Editar alíquota' : 'Nova alíquota'}</div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '4px' }}>Preencha os dados fiscais mínimos para a UF.</div>
            </div>
            {editing ? (
              <span style={{ background: tk.chipBg, color: tk.accentText, borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '600' }}>
                Editando
              </span>
            ) : null}
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
            <Field label="UF" tk={tk}>
              <Input value={uf} onChange={setUf} placeholder="Ex: SP" tk={tk} error={!!formError && !uf} />
            </Field>
            <Field label="Alíquota interna (%)" tk={tk}>
              <Input value={rate} onChange={setRate} placeholder="Ex: 18" type="number" tk={tk} error={!!formError && !rate} />
            </Field>
            <Field label="Vigência (início)" tk={tk}>
              <Input value={startDate} onChange={setStartDate} type="date" tk={tk} error={!!formError && !startDate} />
            </Field>
            <Field label="Vigência (fim)" tk={tk} hint="Opcional">
              <Input value={endDate} onChange={setEndDate} type="date" tk={tk} />
            </Field>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={saveRate}
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
              {editing ? 'Salvar alterações' : 'Salvar alíquota'}
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
                Cancelar edição
              </button>
            ) : null}
          </div>

          {formError ? <div className="message error" style={{ margin: 0 }}>{formError}</div> : null}
        </section>

        <div className="pl-table-wrap" style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: tk.shadow }}>
          {rates.length === 0 ? (
            <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: tk.textSub }}>{Ic.box}</span>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Nenhuma alíquota cadastrada</div>
              <div style={{ fontSize: '13px', color: tk.textSub }}>Crie uma alíquota para a UF desejada.</div>
            </div>
          ) : (
            <>
              <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '880px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tk.surfaceAlt}` }}>
                    {(
                      [
                        { label: 'UF', width: '80px' },
                        { label: 'Alíquota', width: '140px' },
                        { label: 'Vigência', width: '220px' },
                        { label: 'Empresa', width: '200px' },
                        { label: 'Ações', width: '160px' },
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
                  {rates.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="pl-tr"
                      style={{
                        borderBottom: idx < rates.length - 1 ? `1px solid ${tk.surfaceAlt}` : 'none',
                        background: tk.surface,
                        transition: 'background 0.12s',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: tk.text }}>{item.uf}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: tk.text }}>{Number(item.rate).toFixed(2)}%</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>
                        {formatDate(item.startDate)}{item.endDate ? ` até ${formatDate(item.endDate)}` : ''}
                      </td>
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
                            onClick={() => removeRate(item.id)}
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
                {rates.map((item) => (
                  <div key={item.id} style={{ border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '12px', display: 'grid', gap: '8px', background: tk.surface }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: tk.text }}>{item.uf} · {Number(item.rate).toFixed(2)}%</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Vigência: {formatDate(item.startDate)}{item.endDate ? ` até ${formatDate(item.endDate)}` : ''}</div>
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
                        onClick={() => removeRate(item.id)}
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
