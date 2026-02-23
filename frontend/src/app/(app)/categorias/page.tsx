'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Modal from '../../../components/Modal';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

type Category = {
  id: string;
  name: string;
  productCount?: number;
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

export default function CategoriasPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState<Category | null>(null);

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

  const loadCategories = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<Category[]>('/categories', {}, token);
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openEdit = (category: Category) => {
    setEditTarget(category);
    setEditName(category.name);
    setEditError('');
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditTarget(null);
    setEditName('');
    setEditError('');
  };

  const saveEdit = async () => {
    if (!token || !editTarget) return;
    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      setEditError('Informe um nome com pelo menos 2 caracteres.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await apiRequest<Category>(
        `/categories/${editTarget.id}`,
        { method: 'PUT', body: JSON.stringify({ name: trimmed }) },
        token
      );
      setCategories((prev) =>
        prev.map((item) => (item.id === editTarget.id ? { ...item, name: updated.name } : item))
      );
      setEditOpen(false);
      setEditTarget(null);
      setEditName('');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro ao atualizar categoria');
    } finally {
      setEditSaving(false);
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
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>
              Categorias
            </h1>
            <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>
              Organize seus produtos por categoria.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              href="/categorias/nova"
              style={{
                padding: '9px 16px', background: tk.accent, color: '#fff', borderRadius: '8px',
                textDecoration: 'none', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--pl-font)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {Ic.plus} Nova categoria
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12.5px', color: tk.textSub }}>
            {categories.length} categoria{categories.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="pl-table-wrap" style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: tk.shadow }}>
          {loading ? (
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: '52px', background: tk.surfaceAlt, borderRadius: '8px', animation: `pulse 1.5s ease-in-out ${i * 0.08}s infinite` }} />
              ))}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
            </div>
          ) : categories.length === 0 ? (
            <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: tk.textSub }}>{Ic.box}</span>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Nenhuma categoria cadastrada</div>
              <div style={{ fontSize: '13px', color: tk.textSub }}>Crie a primeira categoria para organizar seus produtos.</div>
              <Link
                href="/categorias/nova"
                style={{ marginTop: '4px', padding: '9px 18px', background: tk.accent, color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13.5px', fontWeight: '600', fontFamily: 'var(--pl-font)', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {Ic.plus} Nova categoria
              </Link>
            </div>
          ) : (
            <>
              <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tk.surfaceAlt}` }}>
                    {(
                      [
                        { label: 'ID', width: '260px' },
                        { label: 'Nome', width: 'auto' },
                        { label: 'Qtd. produtos', width: '150px' },
                        { label: 'Ações', width: '120px' },
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
                  {categories.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="pl-tr"
                      style={{
                        borderBottom: idx < categories.length - 1 ? `1px solid ${tk.surfaceAlt}` : 'none',
                        background: tk.surface,
                        transition: 'background 0.12s',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: tk.textSub, fontFamily: 'monospace' }}>{item.id}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13.5px', fontWeight: '600', color: tk.text }}>{item.name}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '12.5px', color: tk.text, background: tk.surfaceAlt, padding: '3px 9px', borderRadius: '20px', fontWeight: '500', fontFamily: 'var(--pl-font)' }}>
                          {item.productCount ?? 0} produto{(item.productCount ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          onClick={() => openEdit(item)}
                          style={{
                            padding: '6px 10px',
                            background: tk.surfaceAlt,
                            border: `1px solid ${tk.border}`,
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: tk.text,
                            cursor: 'pointer'
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pl-cards" style={{ display: 'none', gap: '12px', padding: '16px' }}>
                {categories.map((item) => (
                  <div key={item.id} style={{ border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '12px', display: 'grid', gap: '8px', background: tk.surface }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: tk.text }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: tk.textSub }}>ID {item.id}</div>
                    <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px', width: 'fit-content' }}>
                      {item.productCount ?? 0} produto{(item.productCount ?? 0) !== 1 ? 's' : ''}
                    </span>
                    <div>
                      <button
                        onClick={() => openEdit(item)}
                        style={{
                          padding: '6px 10px',
                          background: tk.surfaceAlt,
                          border: `1px solid ${tk.border}`,
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: tk.text,
                          cursor: 'pointer'
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {editOpen && editTarget && (
        <Modal
          title="Editar categoria"
          subtitle="Atualize o nome da categoria selecionada."
          onClose={closeEdit}
          footer={(
            <div className="modal-actions">
              <button className="btn ghost" onClick={closeEdit} disabled={editSaving}>
                Cancelar
              </button>
              <button
                className="btn primary"
                onClick={saveEdit}
                disabled={editSaving || editName.trim().length < 2}
              >
                Salvar
              </button>
            </div>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: '500', color: tk.textSub }}>
              Nome da categoria
            </label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Ex: Bebidas"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: tk.surface,
                border: `1px solid ${tk.border}`,
                borderRadius: '8px',
                fontSize: '13px',
                color: tk.text,
                outline: 'none'
              }}
            />
            {editError ? <div className="message error">{editError}</div> : null}
          </div>
        </Modal>
      )}
    </div>
  );
}
