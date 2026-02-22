'use client';

import { useEffect, useState } from 'react';
import { apiRequest, apiUpload, fileUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

type PlatformSettings = {
  id: number;
  platformName: string;
  platformDescription?: string | null;
  faviconUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  paymentGateway?: string | null;
  emailEnabled?: boolean;
  emailSender?: string | null;
};

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

function Input({ value, onChange, placeholder, tk, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; tk: ReturnType<typeof tokens>; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '10px 13px',
        background: disabled ? tk.disabledBg : tk.inputBg,
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

export default function PlataformaPage() {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [platformName, setPlatformName] = useState('');
  const [platformDescription, setPlatformDescription] = useState('');
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [faviconDragActive, setFaviconDragActive] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [paymentGateway, setPaymentGateway] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailSender, setEmailSender] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const tk = tokens();

  useEffect(() => {
    if (!faviconFile) {
      setFaviconPreview(null);
      return;
    }
    const url = URL.createObjectURL(faviconFile);
    setFaviconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [faviconFile]);

  const loadSettings = async () => {
    if (!token) return;
    const data = await apiRequest<PlatformSettings>('/platform-settings', {}, token);
    setSettings(data);
    setPlatformName(data.platformName || '');
    setPlatformDescription(data.platformDescription || '');
    setContactEmail(data.contactEmail || '');
    setContactPhone(data.contactPhone || '');
    setPaymentGateway(data.paymentGateway || '');
    setEmailEnabled(Boolean(data.emailEnabled));
    setEmailSender(data.emailSender || '');
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const saveSettings = async () => {
    if (!token) return;
    setMessage('');
    setError('');
    try {
      await apiRequest<PlatformSettings>(
        '/platform-settings',
        {
          method: 'PUT',
          body: JSON.stringify({
            platformName: platformName.trim(),
            platformDescription: platformDescription.trim() || undefined,
            contactEmail: contactEmail.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            paymentGateway: paymentGateway.trim() || undefined,
            emailEnabled,
            emailSender: emailSender.trim() || undefined
          })
        },
        token
      );

      if (faviconFile) {
        const formData = new FormData();
        formData.append('file', faviconFile);
        await apiUpload('/platform-settings/favicon', formData, token);
        setFaviconFile(null);
      }

      await loadSettings();
      setMessage('Configurações atualizadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    }
  };

  const faviconUrl = faviconPreview || (settings?.faviconUrl ? fileUrl(settings.faviconUrl) : '');

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div style={{ padding: 0, background: tk.bg, minHeight: '100%', fontFamily: 'var(--np-font)' }}>
        <div className="card">
          <strong>Configurações da plataforma</strong>
          <p className="hint">Sem permissão para acessar.</p>
        </div>
      </div>
    );
  }

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
          <div style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em' }}>Configurações da plataforma</div>
          <div style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Defina o nome, contato e integrações padrão.</div>
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

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Identidade da plataforma</div>
            <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Nome e descrição exibidos no login e metadata.</div>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Nome da plataforma" tk={tk}>
              <Input value={platformName} onChange={setPlatformName} placeholder="Nome da plataforma" tk={tk} />
            </Field>
            <Field label="Descrição" tk={tk}>
              <Input value={platformDescription} onChange={setPlatformDescription} placeholder="Descrição exibida no metadata" tk={tk} />
            </Field>
            <Field label="Favicon" tk={tk} hint="Arraste ou selecione a imagem que aparecerá no navegador.">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setFaviconDragActive(true);
                }}
                onDragLeave={() => setFaviconDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setFaviconDragActive(false);
                  const file = event.dataTransfer.files?.[0] || null;
                  setFaviconFile(file);
                }}
                style={{
                  border: `1px dashed ${faviconDragActive ? tk.accent : tk.border}`,
                  background: faviconDragActive ? `${tk.accent}12` : tk.inputMuted,
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <input
                  id="platform-favicon"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setFaviconFile(event.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: tk.surface, border: `1px solid ${tk.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {faviconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={faviconUrl} alt="Favicon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '11.5px', color: tk.textSub }}>Ícone</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: tk.textSub }}>
                    {faviconFile ? faviconFile.name : 'Arraste ou selecione o arquivo'}
                  </div>
                </div>
                <label
                  htmlFor="platform-favicon"
                  style={{
                    padding: '6px 10px', background: tk.surface,
                    border: `1px solid ${tk.border}`, borderRadius: '8px',
                    color: tk.text, cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                  }}
                >
                  Selecionar
                </label>
              </div>
            </Field>
          </div>
        </div>

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Contato e integração</div>
            <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Informações exibidas para admins das empresas.</div>
          </div>
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="np-grid-2">
            <Field label="Contato (email)" tk={tk}>
              <Input value={contactEmail} onChange={setContactEmail} placeholder="contato@dominio.com" tk={tk} />
            </Field>
            <Field label="Contato (telefone)" tk={tk}>
              <Input value={contactPhone} onChange={setContactPhone} placeholder="(00) 00000-0000" tk={tk} />
            </Field>
            <Field label="Gateway de pagamento padrão" tk={tk}>
              <Input value={paymentGateway} onChange={setPaymentGateway} placeholder="Gateway configurado" tk={tk} />
            </Field>
          </div>
        </div>

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Email da plataforma</div>
            <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Habilite a recuperação de senha via email no login.</div>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: tk.textSub }}>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(event) => setEmailEnabled(event.target.checked)}
              />
              Recuperação de senha habilitada
            </label>
            <Field label="Email remetente" tk={tk}>
              <Input value={emailSender} onChange={setEmailSender} placeholder="email@dominio.com" tk={tk} disabled={!emailEnabled} />
            </Field>
            {settings ? <span style={{ fontSize: '11.5px', color: tk.textMuted }}>Configurações carregadas.</span> : null}
          </div>
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${tk.border}`, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={saveSettings}
              style={{ padding: '9px 16px', background: tk.accent, border: `1px solid ${tk.accent}`, color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--np-font)' }}
            >
              Salvar configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
