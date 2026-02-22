'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';

const STEPS = [{ n: 1, label: 'Categoria', desc: 'Dados básicos' }];

const Ic = {
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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
    border: 'var(--border)',
    borderFocus: 'var(--accent)',
    text: 'var(--ink)',
    textSub: 'var(--muted)',
    textMuted: 'var(--muted)',
    accent: 'var(--accent)',
    success: '#16a34a',
    successBg: 'rgba(22, 163, 74, 0.12)',
    successBorder: 'rgba(22, 163, 74, 0.28)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.12)',
    errorBorder: 'rgba(239, 68, 68, 0.28)',
    inputBg: 'var(--card)',
    inputBorder: 'var(--border)',
    shadow: 'var(--shadow)',
    stepDone: '#16a34a',
    stepActive: 'var(--accent)',
    stepInactive: 'var(--border)',
    chipBg: 'var(--surface)',
  };
}

function Field({ label, children, tk }: { label: string; children: React.ReactNode; tk: ReturnType<typeof tokens> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12.5px', fontWeight: '500', color: tk.textSub, fontFamily: 'var(--np-font)' }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, tk }: { value: string; onChange: (v: string) => void; placeholder?: string; tk: ReturnType<typeof tokens> }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
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

export default function NovaCategoriaPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const tk = tokens();

  const createCategory = async () => {
    if (!token) return;
    setMessage('');
    setError('');
    try {
      await apiRequest(
        '/categories',
        {
          method: 'POST',
          body: JSON.stringify({ name }),
        },
        token
      );
      setMessage('Categoria criada.');
      setTimeout(() => router.push('/categorias'), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria');
    }
  };

  return (
    <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --np-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }
      `}</style>

      <div style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em' }}>Nova categoria</div>
            <div style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Crie uma nova categoria para organizar produtos.</div>
          </div>
          <button
            onClick={() => router.push('/categorias')}
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

        {message && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: tk.successBg, border: `1px solid ${tk.successBorder}`, borderRadius: '10px' }}>
            <span style={{ fontSize: '13.5px', color: tk.success, fontWeight: '500' }}>{message}</span>
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tk.success, display: 'flex' }}>{Ic.x}</button>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: tk.errorBg, border: `1px solid ${tk.errorBorder}`, borderRadius: '10px' }}>
            <span style={{ fontSize: '13.5px', color: tk.error, fontWeight: '500' }}>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tk.error, display: 'flex' }}>{Ic.x}</button>
          </div>
        )}

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '20px 24px', boxShadow: tk.shadow }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: tk.stepActive, color: '#fff', fontSize: '12px', fontWeight: '600',
              border: `2px solid ${tk.stepActive}`,
            }}>
              {Ic.check}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: tk.text }}>{STEPS[0].label}</div>
              <div style={{ fontSize: '11px', color: tk.textMuted }}>{STEPS[0].desc}</div>
            </div>
          </div>
        </div>

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text, letterSpacing: '-0.01em' }}>Detalhes da categoria</div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Informe o nome da categoria.</div>
            </div>
            <span style={{ fontSize: '11.5px', color: tk.textMuted, background: tk.chipBg, padding: '4px 10px', borderRadius: '20px' }}>Etapa 1 de 1</span>
          </div>
          <div style={{ padding: '24px' }}>
            <Field label="Nome da categoria *" tk={tk}>
              <Input value={name} onChange={setName} placeholder="Ex: Bebidas" tk={tk} />
            </Field>
          </div>
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${tk.border}`, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={createCategory}
              disabled={!name.trim()}
              style={{
                padding: '9px 16px',
                background: name.trim() ? tk.accent : tk.chipBg,
                border: `1px solid ${name.trim() ? tk.accent : tk.border}`,
                color: name.trim() ? '#fff' : tk.textMuted,
                borderRadius: '8px',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'var(--np-font)',
              }}
            >
              Salvar categoria
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
