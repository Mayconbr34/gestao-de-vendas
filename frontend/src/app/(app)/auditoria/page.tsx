'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

type AuditLog = {
  id: string;
  action: string;
  resource: string;
  resourceName?: string | null;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  location?: Record<string, unknown> | null;
  createdAt: string;
  userEmail?: string | null;
  companyName?: string | null;
};

const Ic = {
  box: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4A2 2 0 0 0 13 22l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

export default function AuditoriaPage() {
  const { token } = useAuth();
  const [audits, setAudits] = useState<AuditLog[]>([]);
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
      shadow: 'var(--shadow)',
    }),
    []
  );

  const formatLocation = (location?: Record<string, unknown> | null) => {
    if (!location) return '-';
    const data = location as Record<string, string | undefined>;
    const city = data.city || data.cidade;
    const region = data.region_code || data.region || data.state || data.region_name;
    const country = data.country_name || data.country || data.pais;
    const parts = [city, region, country].filter(Boolean);
    return parts.length ? parts.join(' / ') : JSON.stringify(location);
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<AuditLog[]>('/audits', {}, token)
      .then(setAudits)
      .finally(() => setLoading(false));
  }, [token]);

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
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>Auditoria</h1>
          <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Histórico de acessos e ações no sistema.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12.5px', color: tk.textSub }}>{audits.length} evento{audits.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="pl-table-wrap" style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: tk.shadow }}>
          {loading ? (
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: '52px', background: tk.surfaceAlt, borderRadius: '8px', animation: `pulse 1.5s ease-in-out ${i * 0.08}s infinite` }} />
              ))}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
            </div>
          ) : audits.length === 0 ? (
            <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: tk.textSub }}>{Ic.box}</span>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Nenhuma atividade registrada</div>
              <div style={{ fontSize: '13px', color: tk.textSub }}>As ações aparecerão aqui conforme o uso do sistema.</div>
            </div>
          ) : (
            <>
              <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tk.surfaceAlt}` }}>
                    {(
                      [
                        { label: 'Data', width: '160px' },
                        { label: 'Usuário', width: '200px' },
                        { label: 'Ação', width: '150px' },
                        { label: 'Recurso', width: '150px' },
                        { label: 'Nome', width: '200px' },
                        { label: 'Empresa', width: '180px' },
                        { label: 'IP', width: '120px' },
                        { label: 'Localidade', width: '220px' },
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
                  {audits.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="pl-tr"
                      style={{
                        borderBottom: idx < audits.length - 1 ? `1px solid ${tk.surfaceAlt}` : 'none',
                        background: tk.surface,
                        transition: 'background 0.12s',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>
                        {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: tk.text }}>{item.userEmail || '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: tk.text }}>{item.action}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: tk.textSub }}>{item.resource}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.resourceName || '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.companyName || '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.ip || '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{formatLocation(item.location)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pl-cards" style={{ display: 'none', gap: '12px', padding: '16px' }}>
                {audits.map((item) => (
                  <div key={item.id} style={{ border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '12px', display: 'grid', gap: '8px', background: tk.surface }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: tk.text }}>{item.action}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>{new Date(item.createdAt).toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Usuário: {item.userEmail || '-'}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Recurso: {item.resource} · {item.resourceName || '-'}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Empresa: {item.companyName || '-'}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>IP {item.ip || '-'} · {formatLocation(item.location)}</div>
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
