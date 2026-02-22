'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiRequest, apiUpload, fileUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

type Company = {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
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

const formatCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 8),
    digits.slice(8, 12),
    digits.slice(12, 14)
  ].filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}.${parts[1]}`;
  if (parts.length === 3) return `${parts[0]}.${parts[1]}.${parts[2]}`;
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}`;
  return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}-${parts[4]}`;
};

export default function EmpresasPage() {
  const { token, user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [logoTarget, setLogoTarget] = useState<Company | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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

  const loadCompanies = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<Company[]>('/companies', {}, token);
      setCompanies(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      loadCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  const openLogoModal = (company: Company) => {
    setLogoTarget(company);
    setLogoFile(null);
    setLogoModalOpen(true);
  };

  const uploadLogo = async () => {
    if (!token || !logoTarget || !logoFile) return;
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', logoFile);
      await apiUpload(`/companies/${logoTarget.id}/logo`, formData, token);
      setLogoModalOpen(false);
      setLogoTarget(null);
      setLogoFile(null);
      setMessage('Logo atualizado.');
      await loadCompanies();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao enviar logo');
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div style={{ padding: 0, background: tk.bg, minHeight: '100%', fontFamily: 'var(--pl-font)' }}>
        <div className="card">
          <strong>Empresas</strong>
          <p className="hint">Sem permissão para acessar.</p>
        </div>
      </div>
    );
  }

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
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>Empresas</h1>
            <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Cadastre e personalize empresas do sistema.</p>
          </div>
          <Link
            href="/empresas/nova"
            style={{
              padding: '9px 16px', background: tk.accent, color: '#fff', borderRadius: '8px',
              textDecoration: 'none', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--pl-font)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {Ic.plus} Cadastrar empresa
          </Link>
        </div>

        {message ? (
          <div className="message" style={{ margin: 0 }}>{message}</div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12.5px', color: tk.textSub }}>{companies.length} empresa{companies.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="pl-table-wrap" style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: tk.shadow }}>
          {loading ? (
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: '52px', background: tk.surfaceAlt, borderRadius: '8px', animation: `pulse 1.5s ease-in-out ${i * 0.08}s infinite` }} />
              ))}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
            </div>
          ) : companies.length === 0 ? (
            <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: tk.textSub }}>{Ic.box}</span>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Nenhuma empresa cadastrada</div>
              <div style={{ fontSize: '13px', color: tk.textSub }}>Crie a primeira empresa para começar a operar.</div>
              <Link
                href="/empresas/nova"
                style={{ marginTop: '4px', padding: '9px 18px', background: tk.accent, color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13.5px', fontWeight: '600', fontFamily: 'var(--pl-font)', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {Ic.plus} Cadastrar empresa
              </Link>
            </div>
          ) : (
            <>
              <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tk.surfaceAlt}` }}>
                    {(
                      [
                        { label: 'Logo', width: '80px' },
                        { label: 'Razão Social', width: '260px' },
                        { label: 'Nome', width: '180px' },
                        { label: 'CNPJ', width: '160px' },
                        { label: 'Cor', width: '110px' },
                        { label: 'Ações', width: '200px' },
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
                  {companies.map((company, idx) => (
                    <tr
                      key={company.id}
                      className="pl-tr"
                      style={{
                        borderBottom: idx < companies.length - 1 ? `1px solid ${tk.surfaceAlt}` : 'none',
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
                          {company.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={fileUrl(company.logoUrl)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '13px', fontWeight: '700', color: tk.textSub, fontFamily: 'var(--pl-font)' }}>
                              {company.tradeName?.[0] || 'E'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13.5px', fontWeight: '600', color: tk.text }}>{company.legalName}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: tk.textSub }}>{company.tradeName}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub, fontFamily: 'monospace' }}>{formatCnpj(company.cnpj)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 9px', borderRadius: '20px' }}>{company.primaryColor || '-'}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Link
                            href={`/empresa-config?companyId=${company.id}`}
                            style={{
                              padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`,
                              borderRadius: '8px', fontSize: '12px', color: tk.text, textDecoration: 'none',
                            }}
                          >
                            Configurar
                          </Link>
                          <button
                            onClick={() => openLogoModal(company)}
                            style={{
                              padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`,
                              borderRadius: '8px', fontSize: '12px', color: tk.text, cursor: 'pointer',
                            }}
                          >
                            Logo
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pl-cards" style={{ display: 'none', gap: '12px', padding: '16px' }}>
                {companies.map((company) => (
                  <div key={company.id} style={{ border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '12px', display: 'grid', gap: '10px', background: tk.surface }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {company.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fileUrl(company.logoUrl)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '14px', fontWeight: '700', color: tk.textSub, fontFamily: 'var(--pl-font)' }}>
                            {company.tradeName?.[0] || 'E'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: tk.text }}>{company.tradeName}</div>
                        <div style={{ fontSize: '12px', color: tk.textSub }}>{company.legalName}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>CNPJ {formatCnpj(company.cnpj)}</div>
                    <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px', width: 'fit-content' }}>Cor {company.primaryColor || '-'}</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        href={`/empresa-config?companyId=${company.id}`}
                        style={{ padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: '8px', fontSize: '12px', color: tk.text, textDecoration: 'none' }}
                      >
                        Configurar
                      </Link>
                      <button
                        onClick={() => openLogoModal(company)}
                        style={{ padding: '6px 10px', background: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: '8px', fontSize: '12px', color: tk.text, cursor: 'pointer' }}
                      >
                        Logo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {logoModalOpen && logoTarget && (
        <div className="modal-backdrop" onClick={() => setLogoModalOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Atualizar logo</h3>
              </div>
              <button className="btn ghost" onClick={() => setLogoModalOpen(false)}>
                Fechar
              </button>
            </div>
            <div className="stack">
              <div className="file-field">
                <label>Selecione a imagem</label>
                <input type="file" accept="image/*" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setLogoModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn primary" onClick={uploadLogo}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
