'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/Modal';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

type ApiKeyItem = {
  id: string;
  name: string;
  apiKey: string;
  rateLimitPerMinute: number;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
  totalRequests: number;
  requestsLastHour: number;
  companyId?: string | null;
  companyName?: string | null;
};

type Company = {
  id: string;
  tradeName: string;
};

type ApiRequestLog = {
  id: string;
  method: string;
  path: string;
  status: number;
  createdAt: string;
  ip?: string | null;
};

const Ic = {
  plus: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  box: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4A2 2 0 0 0 13 22l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  x: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#ef4444',
    successBg: 'rgba(22, 163, 74, 0.12)',
    warningBg: 'rgba(245, 158, 11, 0.12)',
    errorBg: 'rgba(239, 68, 68, 0.12)',
    inputBg: 'var(--card)',
    inputBorder: 'var(--border)',
    shadow: 'var(--shadow)',
    chipBg: 'var(--surface)',
  };
}

function Field({ label, children, hint, tk }: { label: string; children: React.ReactNode; hint?: string; tk: ReturnType<typeof tokens> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12.5px', fontWeight: '500', color: tk.textSub, fontFamily: 'var(--np-font)' }}>{label}</label>
      {children}
      {hint ? <span style={{ fontSize: '11.5px', color: tk.textMuted }}>{hint}</span> : null}
    </div>
  );
}

function Input({ value, onChange, placeholder, tk, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; tk: ReturnType<typeof tokens>; type?: string }) {
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

function Select({ value, onChange, options, tk }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; tk: ReturnType<typeof tokens> }) {
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

export default function ApiPage() {
  const { token, user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [requests, setRequests] = useState<ApiRequestLog[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [rateLimit, setRateLimit] = useState('60');
  const [createdSecret, setCreatedSecret] = useState<{ apiKey: string; apiSecret: string } | null>(null);

  const tk = useMemo(() => tokens(), []);

  const loadKeys = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<ApiKeyItem[]>('/api-keys', {}, token);
      setKeys(data);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    if (!token) return;
    if (user?.role !== 'SUPER_ADMIN') return;
    const data = await apiRequest<Company[]>('/companies', {}, token);
    setCompanies(data);
  };

  const loadRequests = async (keyId: string) => {
    if (!token) return;
    const data = await apiRequest<ApiRequestLog[]>(`/api-keys/${keyId}/requests?limit=50`, {}, token);
    setRequests(data);
  };

  useEffect(() => {
    loadKeys();
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createKey = async () => {
    if (!token) return;
    setMessage('');
    try {
      const created = await apiRequest<any>(
        '/api-keys',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            rateLimitPerMinute: Number(rateLimit),
            companyId: user?.role === 'SUPER_ADMIN' ? companyId || undefined : undefined
          })
        },
        token
      );
      setCreatedSecret({ apiKey: created.apiKey, apiSecret: created.apiSecret });
      setName('');
      setRateLimit('60');
      setCompanyId('');
      setMessage('API criada. Copie a chave e o segredo agora.');
      await loadKeys();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao criar API');
    }
  };

  const revokeKey = async (id: string) => {
    if (!token) return;
    setMessage('');
    try {
      await apiRequest(`/api-keys/${id}`, { method: 'DELETE' }, token);
      if (selectedKeyId === id) {
        setSelectedKeyId(null);
        setRequests([]);
      }
      setMessage('API revogada.');
      await loadKeys();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao revogar API');
    }
  };

  const handleSelectRequests = async (id: string) => {
    setSelectedKeyId(id);
    await loadRequests(id);
  };

  const statusPill = (status: number) => {
    const ok = status >= 200 && status < 300;
    const warn = status >= 400 && status < 500;
    const color = ok ? tk.successBg : warn ? tk.warningBg : tk.errorBg;
    const text = ok ? tk.success : warn ? tk.warning : tk.error;
    return (
      <span style={{ background: color, color: text, borderRadius: '999px', padding: '3px 8px', fontSize: '12px', fontWeight: 600 }}>
        {status}
      </span>
    );
  };

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPANY_ADMIN') {
    return (
      <div style={{ padding: 0, background: tk.bg, minHeight: '100%', fontFamily: 'var(--np-font)' }}>
        <div className="card">
          <strong>API</strong>
          <p className="hint">Sem permissão para gerenciar APIs.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 0, background: tk.bg, minHeight: '100%', fontFamily: 'var(--np-font)' }}>
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
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>API</h1>
            <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Gerencie chaves, limites e monitore chamadas externas.</p>
          </div>
          <button
            onClick={() => {
              setCreatedSecret(null);
              setModalOpen(true);
            }}
            style={{
              padding: '9px 16px', background: tk.accent, color: '#fff', borderRadius: '8px',
              border: `1px solid ${tk.accent}`, fontSize: '13px', fontWeight: '600', fontFamily: 'var(--np-font)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {Ic.plus} Nova API
          </button>
        </div>

        {message ? <div className="message" style={{ margin: 0 }}>{message}</div> : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12.5px', color: tk.textSub }}>{keys.length} chave{keys.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="pl-table-wrap" style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: tk.shadow }}>
          {loading ? (
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: '52px', background: tk.surfaceAlt, borderRadius: '8px', animation: `pulse 1.5s ease-in-out ${i * 0.08}s infinite` }} />
              ))}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
            </div>
          ) : keys.length === 0 ? (
            <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: tk.textSub }}>{Ic.box}</span>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Nenhuma API criada</div>
              <div style={{ fontSize: '13px', color: tk.textSub }}>Crie sua primeira chave para integrar sistemas externos.</div>
            </div>
          ) : (
            <>
              <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '960px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tk.surfaceAlt}` }}>
                    {(
                      [
                        { label: 'Nome', width: '180px' },
                        { label: 'API Key', width: '230px' },
                        { label: 'Limite/min', width: '120px' },
                        { label: 'Req. hora', width: '110px' },
                        { label: 'Total', width: '110px' },
                        { label: 'Último uso', width: '180px' },
                        { label: 'Empresa', width: '160px' },
                        { label: 'Ações', width: '150px' },
                      ] as { label: string; width: string }[]
                    ).map(({ label, width }, i) => (
                      <th key={i} style={{ width, padding: '11px 14px', textAlign: 'left', fontSize: '11.5px', fontWeight: '600', color: tk.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--np-font)', background: tk.surface, whiteSpace: 'nowrap' }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((item, idx) => (
                    <tr key={item.id} className="pl-tr" style={{ borderBottom: idx < keys.length - 1 ? `1px solid ${tk.surfaceAlt}` : 'none', background: tk.surface, transition: 'background 0.12s' }}>
                      <td style={{ padding: '10px 14px', fontSize: '13.5px', fontWeight: '600', color: tk.text }}>{item.name}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub, fontFamily: 'monospace' }}>{item.apiKey}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.rateLimitPerMinute}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.requestsLastHour}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.totalRequests}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString('pt-BR') : '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.companyName || item.companyId || '-'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => handleSelectRequests(item.id)} style={{ padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: '8px', fontSize: '12px', color: tk.text, cursor: 'pointer' }}>Requests</button>
                          <button onClick={() => revokeKey(item.id)} style={{ padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: '8px', fontSize: '12px', color: tk.text, cursor: 'pointer' }}>Revogar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pl-cards" style={{ display: 'none', gap: '12px', padding: '16px' }}>
                {keys.map((item) => (
                  <div key={item.id} style={{ border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '12px', display: 'grid', gap: '8px', background: tk.surface }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: tk.text }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub, fontFamily: 'monospace' }}>{item.apiKey}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>Limite {item.rateLimitPerMinute}/min</span>
                      <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>{item.requestsLastHour} req/h</span>
                      <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>{item.totalRequests} total</span>
                    </div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Último uso: {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString('pt-BR') : '-'}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Empresa: {item.companyName || item.companyId || '-'}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleSelectRequests(item.id)} style={{ padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: '8px', fontSize: '12px', color: tk.text, cursor: 'pointer' }}>Requests</button>
                      <button onClick={() => revokeKey(item.id)} style={{ padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: '8px', fontSize: '12px', color: tk.text, cursor: 'pointer' }}>Revogar</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {selectedKeyId ? (
          <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Requests recentes</div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Últimas chamadas para a chave selecionada.</div>
            </div>
            <div style={{ padding: '0 0 8px' }}>
              {requests.length === 0 ? (
                <div style={{ padding: '24px', fontSize: '12px', color: tk.textSub }}>Nenhuma request para esta chave.</div>
              ) : (
                <>
                  <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${tk.surfaceAlt}` }}>
                        {(
                          [
                            { label: 'Data', width: '180px' },
                            { label: 'Método', width: '100px' },
                            { label: 'Rota', width: '260px' },
                            { label: 'Status', width: '120px' },
                            { label: 'IP', width: '140px' },
                          ] as { label: string; width: string }[]
                        ).map(({ label, width }, i) => (
                          <th key={i} style={{ width, padding: '11px 14px', textAlign: 'left', fontSize: '11.5px', fontWeight: '600', color: tk.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--np-font)', background: tk.surface, whiteSpace: 'nowrap' }}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((item, idx) => (
                        <tr key={item.id} className="pl-tr" style={{ borderBottom: idx < requests.length - 1 ? `1px solid ${tk.surfaceAlt}` : 'none', background: tk.surface }}>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{new Date(item.createdAt).toLocaleString('pt-BR')}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.method}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.path}</td>
                          <td style={{ padding: '10px 14px' }}>{statusPill(item.status)}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.ip || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="pl-cards" style={{ display: 'none', gap: '12px', padding: '16px' }}>
                    {requests.map((item) => (
                      <div key={item.id} style={{ border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '12px', display: 'grid', gap: '8px', background: tk.surface }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: tk.text }}>{item.method} · {item.path}</div>
                        <div style={{ fontSize: '12px', color: tk.textSub }}>{new Date(item.createdAt).toLocaleString('pt-BR')}</div>
                        {statusPill(item.status)}
                        <div style={{ fontSize: '12px', color: tk.textSub }}>IP {item.ip || '-'}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {modalOpen && (
        <Modal
          title="Criar API"
          onClose={() => {
            setModalOpen(false);
            setCreatedSecret(null);
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Nome" tk={tk}>
              <Input value={name} onChange={setName} placeholder="Nome" tk={tk} />
            </Field>
            <Field label="Limite por minuto" tk={tk}>
              <Input value={rateLimit} onChange={setRateLimit} placeholder="Limite por minuto" tk={tk} type="number" />
            </Field>
            {user?.role === 'SUPER_ADMIN' ? (
              <Field label="Empresa" tk={tk}>
                <Select value={companyId} onChange={setCompanyId} options={[{ value: '', label: 'Selecione' }, ...companies.map((c) => ({ value: c.id, label: c.tradeName }))]} tk={tk} />
              </Field>
            ) : null}
            <button className="btn primary" onClick={createKey}>
              Gerar chave
            </button>
            {createdSecret ? (
              <div className="secret-box">
                <p><strong>API Key:</strong> {createdSecret.apiKey}</p>
                <p><strong>API Secret:</strong> {createdSecret.apiSecret}</p>
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
}
