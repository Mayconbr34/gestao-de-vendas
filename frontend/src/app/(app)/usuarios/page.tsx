'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Modal from '../../../components/Modal';
import { apiRequest, fileUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

type User = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  avatarUrl?: string | null;
  companyName?: string | null;
  createdAt?: string;
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
};

export default function UsuariosPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const tk = useMemo(
    () => ({
      bg: 'var(--bg)',
      surface: 'var(--card)',
      surfaceAlt: 'var(--surface)',
      border: 'var(--border)',
      text: 'var(--ink)',
      textSub: 'var(--muted)',
      accent: 'var(--accent)',
      chipBg: 'var(--sidebar-active-bg)',
      chipText: 'var(--accent-dark)',
      shadow: 'var(--shadow)',
    }),
    []
  );

  const loadUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<User[]>('/users', {}, token);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const generateResetLink = async (id: string) => {
    if (!token) return;
    setMessage('');
    try {
      const data = await apiRequest<{ resetLink: string }>(`/users/${id}/reset-password`, { method: 'POST' }, token);
      setResetLink(data.resetLink);
      setResetModalOpen(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao gerar link');
    }
  };

  return (
    <div style={{ padding: 0, background: tk.bg, minHeight: '100%', fontFamily: 'var(--pl-font)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --pl-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
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
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>Usuários</h1>
            <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Gerencie contas internas do sistema.</p>
          </div>
          {user?.role !== 'COMPANY_USER' ? (
            <Link
              href="/usuarios/novo"
              style={{
                padding: '9px 16px', background: tk.accent, color: '#fff', borderRadius: '8px',
                textDecoration: 'none', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--pl-font)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {Ic.plus} Novo usuário
            </Link>
          ) : null}
        </div>

        {message ? <div className="message" style={{ margin: 0 }}>{message}</div> : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12.5px', color: tk.textSub }}>{users.length} usuário{users.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="pl-table-wrap" style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: tk.shadow }}>
          {loading ? (
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: '52px', background: tk.surfaceAlt, borderRadius: '8px', animation: `pulse 1.5s ease-in-out ${i * 0.08}s infinite` }} />
              ))}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: tk.textSub }}>{Ic.box}</span>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Nenhum usuário encontrado</div>
              <div style={{ fontSize: '13px', color: tk.textSub }}>Crie a primeira conta para sua equipe.</div>
              {user?.role !== 'COMPANY_USER' ? (
                <Link
                  href="/usuarios/novo"
                  style={{ marginTop: '4px', padding: '9px 18px', background: tk.accent, color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13.5px', fontWeight: '600', fontFamily: 'var(--pl-font)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {Ic.plus} Novo usuário
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tk.surfaceAlt}` }}>
                    {(
                      [
                        { label: 'Avatar', width: '70px' },
                        { label: 'Nome', width: '200px' },
                        { label: 'Email', width: '220px' },
                        { label: 'Role', width: '130px' },
                        { label: 'Empresa', width: '180px' },
                        { label: 'Criado', width: '120px' },
                        { label: 'Ações', width: '160px' },
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
                          fontFamily: 'var(--pl-font)',
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
                  {users.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="pl-tr"
                      style={{
                        borderBottom: idx < users.length - 1 ? `1px solid ${tk.surfaceAlt}` : 'none',
                        background: tk.surface,
                        transition: 'background 0.12s',
                      }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '8px',
                          background: tk.surfaceAlt, border: `1px solid ${tk.border}`,
                          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={fileUrl(item.avatarUrl)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '13px', fontWeight: '700', color: tk.textSub, fontFamily: 'var(--pl-font)' }}>
                              {item.email?.[0] || 'U'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13.5px', fontWeight: '600', color: tk.text }}>
                        {item.name || item.email}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: tk.textSub }}>{item.email}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 9px', borderRadius: '20px' }}>{item.role}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: tk.textSub }}>{item.companyName || '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub }}>{item.createdAt?.slice(0, 10) || '-'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {(user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') ? (
                          <button
                            onClick={() => generateResetLink(item.id)}
                            style={{
                              padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`,
                              borderRadius: '8px', fontSize: '12px', color: tk.text, cursor: 'pointer',
                            }}
                          >
                            Reset senha
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pl-cards" style={{ display: 'none', gap: '12px', padding: '16px' }}>
                {users.map((item) => (
                  <div key={item.id} style={{ border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '12px', display: 'grid', gap: '10px', background: tk.surface }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fileUrl(item.avatarUrl)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '14px', fontWeight: '700', color: tk.textSub, fontFamily: 'var(--pl-font)' }}>
                            {item.email?.[0] || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: tk.text }}>{item.name || item.email}</div>
                        <div style={{ fontSize: '12px', color: tk.textSub }}>{item.email}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px', width: 'fit-content' }}>{item.role}</span>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Empresa: {item.companyName || '-'}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>Criado: {item.createdAt?.slice(0, 10) || '-'}</div>
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') ? (
                      <button
                        onClick={() => generateResetLink(item.id)}
                        style={{ padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: '8px', fontSize: '12px', color: tk.text, cursor: 'pointer', width: 'fit-content' }}
                      >
                        Reset senha
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {resetModalOpen && (
        <Modal
          title="Link de redefinição"
          subtitle="Envie este link para o usuário."
          onClose={() => setResetModalOpen(false)}
          footer={
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setResetModalOpen(false)}>
                Fechar
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  if (resetLink) navigator.clipboard.writeText(resetLink);
                }}
              >
                Copiar link
              </button>
            </div>
          }
        >
          <div className="secret-box">
            <p>{resetLink}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
