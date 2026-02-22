'use client';

import { useEffect, useState } from 'react';
import { apiRequest, apiUpload, fileUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

const Ic = {
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
    successBg: 'rgba(22, 163, 74, 0.12)',
    successBorder: 'rgba(22, 163, 74, 0.28)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.12)',
    errorBorder: 'rgba(239, 68, 68, 0.28)',
    inputBg: 'var(--card)',
    inputBorder: 'var(--border)',
    shadow: 'var(--shadow)',
    chipBg: 'var(--surface)',
    disabledBg: 'var(--surface)',
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

function Input({ value, onChange, placeholder, tk, disabled, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; tk: ReturnType<typeof tokens>; disabled?: boolean; type?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '10px 13px',
        background: disabled ? tk.surfaceAlt : tk.inputBg,
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

export default function PerfilPage() {
  const { token, user, updateUser } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profileName, setProfileName] = useState(user?.name || '');
  const [dragActive, setDragActive] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const tk = tokens();

  useEffect(() => {
    setProfileName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const saveProfile = async () => {
    if (!token) return;
    setMessage('');
    setError('');
    try {
      const updated = await apiRequest<any>(
        '/users/me',
        {
          method: 'PUT',
          body: JSON.stringify({ name: profileName })
        },
        token
      );
      updateUser({
        ...(user as any),
        name: updated.name ?? null
      });
      setMessage('Perfil atualizado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    }
  };

  const uploadAvatar = async () => {
    if (!token || !avatarFile) return;
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', avatarFile);
      const updated = await apiUpload<any>('/users/me/avatar', formData, token);
      updateUser({
        ...(user as any),
        avatarUrl: updated.avatarUrl ?? null
      });
      setAvatarFile(null);
      setMessage('Avatar atualizado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar avatar');
    }
  };

  const changePassword = async () => {
    if (!token) return;
    setPasswordMessage('');
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos da senha.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da senha não confere.');
      return;
    }
    try {
      await apiRequest(
        '/users/me/change-password',
        {
          method: 'POST',
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        },
        token
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Senha atualizada com sucesso.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erro ao atualizar senha');
    }
  };

  const avatarSrc = avatarPreview || (user?.avatarUrl ? fileUrl(user.avatarUrl) : null);

  return (
    <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --np-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }
        @media (max-width: 700px) {
          .np-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em' }}>Meu perfil</div>
          <div style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Personalize sua conta e acompanhe seu status.</div>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px' }} className="np-grid-2">
          <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Dados do perfil</div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Atualize nome e dados da conta.</div>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Nome" tk={tk}>
                <Input value={profileName} onChange={setProfileName} placeholder="Nome" tk={tk} />
              </Field>
              <Field label="Email" tk={tk}>
                <Input value={user?.email || ''} onChange={() => {}} placeholder="Email" tk={tk} disabled />
              </Field>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: tk.text, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>{user?.role || 'Usuário'}</span>
                {user?.company?.tradeName ? (
                  <span style={{ fontSize: '12px', color: tk.textSub, background: tk.surfaceAlt, padding: '3px 8px', borderRadius: '20px' }}>{user.company.tradeName}</span>
                ) : null}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${tk.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={saveProfile}
                style={{ padding: '9px 16px', background: tk.accent, border: `1px solid ${tk.accent}`, color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--np-font)' }}
              >
                Salvar perfil
              </button>
            </div>
          </div>

          <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Avatar</div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Atualize sua foto de perfil.</div>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                width: '120px', height: '120px', borderRadius: '18px',
                background: tk.surfaceAlt, border: `1px solid ${tk.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '24px', fontWeight: '700', color: tk.textSub }}>{user?.email?.[0] || 'U'}</span>
                )}
              </div>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  const file = event.dataTransfer.files?.[0] || null;
                  setAvatarFile(file);
                }}
                style={{
                  border: `1px dashed ${dragActive ? tk.accent : tk.border}`,
                  background: dragActive ? `${tk.accent}12` : tk.surfaceAlt,
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <input
                  id="avatar-file"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '12px', color: tk.textSub }}>
                  {avatarFile ? avatarFile.name : 'Arraste ou selecione a imagem'}
                </div>
                <label
                  htmlFor="avatar-file"
                  style={{
                    padding: '6px 10px', background: tk.surface,
                    border: `1px solid ${tk.border}`, borderRadius: '8px',
                    color: tk.text, cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                  }}
                >
                  Selecionar
                </label>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${tk.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={uploadAvatar}
                disabled={!avatarFile}
                style={{
                  padding: '9px 16px',
                  background: avatarFile ? tk.accent : tk.disabledBg,
                  border: `1px solid ${avatarFile ? tk.accent : tk.border}`,
                  color: avatarFile ? '#fff' : tk.textMuted,
                  borderRadius: '8px',
                  cursor: avatarFile ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: '600',
                  fontFamily: 'var(--np-font)',
                }}
              >
                Salvar avatar
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Segurança</div>
            <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Atualize sua senha de acesso.</div>
          </div>
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }} className="np-grid-2">
            <Field label="Senha atual" tk={tk}>
              <Input value={currentPassword} onChange={setCurrentPassword} placeholder="Senha atual" tk={tk} type="password" />
            </Field>
            <Field label="Nova senha" tk={tk}>
              <Input value={newPassword} onChange={setNewPassword} placeholder="Nova senha" tk={tk} type="password" />
            </Field>
            <Field label="Confirmar senha" tk={tk}>
              <Input value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirmar senha" tk={tk} type="password" />
            </Field>
          </div>
          {passwordMessage ? (
            <div style={{ margin: '0 24px 16px', padding: '10px 12px', background: tk.successBg, border: `1px solid ${tk.successBorder}`, borderRadius: '8px', color: tk.success, fontSize: '12.5px', fontWeight: 500 }}>
              {passwordMessage}
            </div>
          ) : null}
          {passwordError ? (
            <div style={{ margin: '0 24px 16px', padding: '10px 12px', background: tk.errorBg, border: `1px solid ${tk.errorBorder}`, borderRadius: '8px', color: tk.error, fontSize: '12.5px', fontWeight: 500 }}>
              {passwordError}
            </div>
          ) : null}
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${tk.border}`, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={changePassword}
              style={{
                padding: '9px 16px',
                background: tk.accent,
                border: `1px solid ${tk.accent}`,
                color: '#fff',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'var(--np-font)',
              }}
            >
              Atualizar senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
