'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { fetchPublicPlatformSettings } from '../../lib/platform-settings';

/* ─── Icons ──────────────────────────────────────────────── */

const Ic = {
  eye: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  eyeOff: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  lock: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  lockOpen: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
  ),
  alertCircle: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  checkCircle: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  arrowLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
};

/* ─── Password strength ──────────────────────────────────── */

function getStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '#e5e7eb' };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Muito fraca', color: '#ef4444' };
  if (score === 2) return { score, label: 'Fraca', color: '#f97316' };
  if (score === 3) return { score, label: 'Razoável', color: '#eab308' };
  if (score === 4) return { score, label: 'Forte', color: '#22c55e' };
  return { score, label: 'Muito forte', color: '#16a34a' };
}

/* ─── Field ──────────────────────────────────────────────── */

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12.5px', fontWeight: '500', color: '#6b7280', fontFamily: 'var(--rp-font)' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          color: focused ? '#2563eb' : '#9ca3af', display: 'flex', pointerEvents: 'none',
          transition: 'color 0.15s',
        }}>
          {Ic.lock}
        </span>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '11px 40px 11px 38px',
            background: '#fff',
            border: `1px solid ${error ? '#fca5a5' : focused ? '#2563eb' : '#e5e7eb'}`,
            borderRadius: '9px',
            fontSize: '14px',
            color: '#111827',
            fontFamily: 'var(--rp-font)',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: focused
              ? error ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(37,99,235,0.1)'
              : '0 1px 2px rgba(0,0,0,0.04)',
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((p) => !p)}
          style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
            display: 'flex', padding: '2px', transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#374151')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#9ca3af')}
        >
          {show ? Ic.eyeOff : Ic.eye}
        </button>
      </div>
    </div>
  );
}

/* ─── Strength bar ───────────────────────────────────────── */

function StrengthBar({ password }: { password: string }) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;

  const rules = [
    { ok: password.length >= 6, label: 'Mínimo 6 caracteres' },
    { ok: /[A-Z]/.test(password), label: 'Letra maiúscula' },
    { ok: /[0-9]/.test(password), label: 'Número' },
    { ok: /[^a-zA-Z0-9]/.test(password), label: 'Caractere especial' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Bar */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: '3px', borderRadius: '3px',
              background: i < score ? color : '#f3f4f6',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {rules.map((r) => (
            <span
              key={r.label}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontFamily: 'var(--rp-font)',
                color: r.ok ? '#16a34a' : '#9ca3af',
                transition: 'color 0.15s',
              }}
            >
              <span style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: r.ok ? '#dcfce7' : '#f3f4f6',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: r.ok ? '#16a34a' : '#d1d5db',
                transition: 'all 0.15s', flexShrink: 0,
              }}>
                {Ic.check}
              </span>
              {r.label}
            </span>
          ))}
        </div>
        {label && (
          <span style={{ fontSize: '11.5px', fontWeight: '600', color, fontFamily: 'var(--rp-font)', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [platformName, setPlatformName] = useState('Plataforma');

  useEffect(() => {
    fetchPublicPlatformSettings()
      .then((d) => setPlatformName(d.platformName || 'Plataforma'))
      .catch(() => setPlatformName('Plataforma'));
  }, []);

  const brandInitials = platformName
    .split(' ').filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase()).join('');

  const { score } = getStrength(password);
  const passwordsMatch = password && confirm && password === confirm;
  const canSubmit = score >= 1 && password.length >= 6 && passwordsMatch && !loading;

  const handleReset = async () => {
    setMessage('');
    if (!token) { setMessage('Token inválido ou expirado.'); return; }
    if (password.length < 6) { setMessage('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { setMessage('As senhas não conferem.'); return; }
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'var(--rp-font)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --rp-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 40px white inset !important;
          -webkit-text-fill-color: #111827 !important;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%', width: '500px', height: '500px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%', width: '400px', height: '400px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px',
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 24px 48px -8px rgba(0,0,0,0.08)',
        overflow: 'hidden', animation: 'fadeIn 0.3s ease',
      }}>

        {/* Top accent */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #2563eb, #6366f1)' }} />

        {success ? (
          /* ── Success state ── */
          <div style={{ padding: '48px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
            <div style={{
              width: '56px', height: '56px', background: '#f0fdf4', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #bbf7d0', animation: 'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827', letterSpacing: '-0.025em' }}>
                Senha atualizada!
              </div>
              <div style={{ fontSize: '13.5px', color: '#9ca3af', marginTop: '6px', lineHeight: 1.5 }}>
                Sua senha foi redefinida com sucesso.<br />
                Você será redirecionado para o login.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                  width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e',
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }`}</style>
          </div>
        ) : (
          /* ── Form state ── */
          <div style={{ padding: '36px 36px 32px' }}>

            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '32px' }}>
              <div style={{
                width: '38px', height: '38px', background: '#111827', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '700', color: '#fff', letterSpacing: '0.02em', flexShrink: 0,
              }}>
                {brandInitials || 'PL'}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', letterSpacing: '-0.025em' }}>
                  {platformName}
                </div>
                <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '1px' }}>Admin console</div>
              </div>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', background: '#eff6ff', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0,
                }}>
                  {Ic.shield}
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', letterSpacing: '-0.03em', margin: 0 }}>
                  Redefinir senha
                </h1>
              </div>
              <p style={{ fontSize: '13.5px', color: '#9ca3af', lineHeight: 1.5 }}>
                Crie uma senha forte para proteger sua conta.
              </p>
            </div>

            {/* Invalid token */}
            {!token && (
              <div style={{
                padding: '12px 14px', background: '#fef2f2',
                border: '1px solid #fecaca', borderRadius: '9px',
                fontSize: '13px', color: '#dc2626', fontWeight: '500',
                display: 'flex', alignItems: 'center', gap: '7px',
                marginBottom: '20px',
              }}>
                {Ic.alertCircle}
                Link inválido ou expirado. Solicite um novo.
              </div>
            )}

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <PasswordField
                label="Nova senha"
                value={password}
                onChange={setPassword}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                error={Boolean(message)}
              />

              {/* Strength */}
              {password && <StrengthBar password={password} />}

              <PasswordField
                label="Confirmar senha"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                error={Boolean(message && password !== confirm)}
              />

              {/* Match indicator */}
              {confirm && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', color: passwordsMatch ? '#16a34a' : '#dc2626',
                  fontFamily: 'var(--rp-font)', transition: 'color 0.15s',
                }}>
                  <span style={{ display: 'flex' }}>
                    {passwordsMatch ? Ic.checkCircle : Ic.alertCircle}
                  </span>
                  {passwordsMatch ? 'As senhas conferem' : 'As senhas não conferem'}
                </div>
              )}
            </div>

            {/* Error */}
            {message && (
              <div style={{
                marginTop: '14px', display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 13px', background: '#fef2f2',
                border: '1px solid #fecaca', borderRadius: '8px',
              }}>
                <span style={{ color: '#dc2626', display: 'flex', flexShrink: 0 }}>{Ic.alertCircle}</span>
                <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500', fontFamily: 'var(--rp-font)' }}>
                  {message}
                </span>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleReset}
              disabled={!canSubmit}
              style={{
                width: '100%', marginTop: '22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px', borderRadius: '9px', border: 'none',
                background: canSubmit ? '#111827' : '#e5e7eb',
                color: canSubmit ? '#fff' : '#9ca3af',
                fontSize: '14px', fontWeight: '600', fontFamily: 'var(--rp-font)',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s', letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = '#1f2937'; }}
              onMouseLeave={(e) => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = '#111827'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '14px', height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #fff', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }} />
                  Atualizando...
                </>
              ) : (
                <>
                  {Ic.lockOpen} Atualizar senha
                </>
              )}
            </button>

            {/* Back to login */}
            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%', marginTop: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px', background: 'none',
                border: '1px solid #e5e7eb', borderRadius: '9px',
                color: '#6b7280', fontSize: '13.5px', fontFamily: 'var(--rp-font)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db';
                (e.currentTarget as HTMLButtonElement).style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
              }}
            >
              {Ic.arrowLeft} Voltar para o login
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 36px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
          <p style={{ fontSize: '11.5px', color: '#d1d5db', textAlign: 'center', fontFamily: 'var(--rp-font)' }}>
            Acesso restrito a usuários autorizados
          </p>
        </div>
      </div>
    </main>
  );
}