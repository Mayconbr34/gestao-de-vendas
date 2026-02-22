'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../lib/auth';
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
  arrow: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  mail: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  lock: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  alertCircle: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

/* ─── Field component ────────────────────────────────────── */

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  suffix,
  error,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: boolean;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontSize: '12.5px', fontWeight: '500', color: '#6b7280',
        fontFamily: 'var(--ln-font)',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', color: focused ? '#2563eb' : '#9ca3af',
            display: 'flex', pointerEvents: 'none', transition: 'color 0.15s',
          }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).form?.requestSubmit?.()}
          style={{
            width: '100%',
            padding: `11px ${suffix ? '40px' : '14px'} 11px ${icon ? '38px' : '14px'}`,
            background: '#fff',
            border: `1px solid ${error ? '#fca5a5' : focused ? '#2563eb' : '#e5e7eb'}`,
            borderRadius: '9px',
            fontSize: '14px',
            color: '#111827',
            fontFamily: 'var(--ln-font)',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: focused
              ? error
                ? '0 0 0 3px rgba(239,68,68,0.1)'
                : '0 0 0 3px rgba(37,99,235,0.1)'
              : '0 1px 2px rgba(0,0,0,0.04)',
          }}
        />
        {suffix && (
          <span style={{
            position: 'absolute', right: '12px', top: '50%',
            transform: 'translateY(-50%)', display: 'flex',
          }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [platformName, setPlatformName] = useState('Plataforma');
  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    fetchPublicPlatformSettings()
      .then((data) => {
        setPlatformName(data.platformName || 'Plataforma');
        setEmailEnabled(Boolean(data.emailEnabled));
      })
      .catch(() => {
        setPlatformName('Plataforma');
        setEmailEnabled(false);
      });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage('Preencha o e-mail e a senha.');
      return;
    }
    setMessage('');
    setLoading(true);
    try {
      const result = await apiRequest<{
        access_token: string;
        user: { id: string; email: string; role: any; companyId?: string | null; company?: any };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(result.access_token, result.user);
      router.push('/dashboard');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  const brandInitials = platformName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--ln-font)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --ln-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 40px white inset !important;
          -webkit-text-fill-color: #111827 !important;
        }
      `}</style>

      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
        }} />
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
      </div>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '400px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 24px 48px -8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>

        {/* Top accent line */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #2563eb, #6366f1)' }} />

        <div style={{ padding: '36px 36px 32px' }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '32px' }}>
            <div style={{
              width: '38px', height: '38px', background: '#111827',
              borderRadius: '10px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '13px', fontWeight: '700',
              color: '#fff', letterSpacing: '0.02em', flexShrink: 0,
            }}>
              {brandInitials || 'PL'}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', letterSpacing: '-0.025em' }}>
                {platformName}
              </div>
              <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '1px' }}>
                Admin console
              </div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '21px', fontWeight: '700', color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0 }}>
              Bem-vindo de volta
            </h1>
            <p style={{ fontSize: '13.5px', color: '#9ca3af', marginTop: '6px' }}>
              Entre com suas credenciais para acessar.
            </p>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field
              label="E-mail"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="seu@email.com"
              icon={Ic.mail}
              autoComplete="email"
              error={Boolean(message)}
            />

            <Field
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              icon={Ic.lock}
              autoComplete="current-password"
              error={Boolean(message)}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', display: 'flex', padding: '2px',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#374151')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#9ca3af')}
                  tabIndex={-1}
                >
                  {showPassword ? Ic.eyeOff : Ic.eye}
                </button>
              }
            />
          </div>

          {/* Error message */}
          {message && (
            <div style={{
              marginTop: '14px',
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 13px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px',
            }}>
              <span style={{ color: '#dc2626', display: 'flex', flexShrink: 0 }}>{Ic.alertCircle}</span>
              <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500', fontFamily: 'var(--ln-font)' }}>
                {message}
              </span>
            </div>
          )}

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', marginTop: '22px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px',
              background: loading ? '#9ca3af' : '#111827',
              color: '#fff', border: 'none', borderRadius: '9px',
              fontSize: '14px', fontWeight: '600', fontFamily: 'var(--ln-font)',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1f2937'; }}
            onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#111827'; }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.7s linear infinite',
                }} />
                Entrando...
              </>
            ) : (
              <>
                Entrar {Ic.arrow}
              </>
            )}
          </button>

          {/* Forgot password */}
          {emailEnabled && (
            <button
              onClick={() => router.push('/recuperar-senha')}
              style={{
                width: '100%', marginTop: '10px',
                padding: '10px',
                background: 'none', border: '1px solid #e5e7eb',
                borderRadius: '9px', color: '#6b7280',
                fontSize: '13.5px', fontFamily: 'var(--ln-font)',
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
              Esqueci minha senha
            </button>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 36px',
          borderTop: '1px solid #f3f4f6',
          background: '#fafafa',
        }}>
          <p style={{ fontSize: '11.5px', color: '#d1d5db', textAlign: 'center', fontFamily: 'var(--ln-font)' }}>
            Acesso restrito a usuários autorizados
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}