'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, apiUpload } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';

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

const sanitizeCep = (value: string) => value.replace(/\D/g, '').slice(0, 8);

const STEPS = [
  { n: 1, label: 'Identidade', desc: 'Dados principais' },
  { n: 2, label: 'Endereço', desc: 'Localização fiscal' },
  { n: 3, label: 'Contato', desc: 'Canais da empresa' }
];

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
    inputMuted: 'var(--surface)',
    shadow: 'var(--shadow)',
    stepDone: '#16a34a',
    stepActive: 'var(--accent)',
    stepInactive: 'var(--border)',
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

function Input({ value, onChange, placeholder, type = 'text', tk }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; tk: ReturnType<typeof tokens> }) {
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

export default function NovaEmpresaPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cepInfo, setCepInfo] = useState('');

  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [addressCep, setAddressCep] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);

  const tk = tokens();

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const handleCepLookup = async (value: string) => {
    const normalized = sanitizeCep(value);
    setAddressCep(normalized);
    setCepInfo('');
    if (normalized.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${normalized}/json/`);
      if (!response.ok) {
        setCepInfo('CEP não encontrado.');
        return;
      }
      const data = await response.json();
      if (data.erro) {
        setCepInfo('CEP não encontrado.');
        return;
      }
      setAddressStreet(data.logradouro || '');
      setAddressNeighborhood(data.bairro || '');
      setAddressCity(data.localidade || '');
      setAddressState(data.uf || '');
      setAddressComplement(data.complemento || '');
      setCepInfo('Endereço preenchido automaticamente.');
    } catch {
      setCepInfo('Erro ao consultar CEP.');
    }
  };

  const createCompany = async () => {
    if (!token) return;
    setMessage('');
    setError('');
    try {
      const created = await apiRequest<any>(
        '/companies',
        {
          method: 'POST',
          body: JSON.stringify({
            legalName,
            tradeName,
            cnpj: cnpj.replace(/\D/g, ''),
            addressCep,
            addressStreet,
            addressNumber,
            addressComplement,
            addressNeighborhood,
            addressCity,
            addressState,
            contactEmail,
            contactPhone,
            primaryColor,
          }),
        },
        token
      );

      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        await apiUpload(`/companies/${created.id}/logo`, formData, token);
      }

      setMessage('Empresa criada.');
      router.push('/empresas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar empresa');
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div style={{ padding: 0, background: tk.bg, minHeight: '100%', fontFamily: 'var(--np-font)' }}>
        <div className="card">
          <strong>Nova empresa</strong>
          <p className="hint">Sem permissão para acessar.</p>
        </div>
      </div>
    );
  }

  const canContinueStep1 =
    legalName.trim().length > 1 &&
    tradeName.trim().length > 1 &&
    cnpj.replace(/\D/g, '').length === 14;
  const canContinueStep2 =
    addressCep.trim().length === 8 &&
    addressNumber.trim().length > 0;

  return (
    <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)', transition: 'background 0.2s' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --np-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }
        @media (max-width: 700px) {
          .np-grid-2 { grid-template-columns: 1fr !important; }
          .np-steps { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
          .np-connector { display: none !important; }
        }
      `}</style>

      <div style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em' }}>
              Cadastrar empresa
            </div>
            <div style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>
              Preencha dados cadastrais e endereço.
            </div>
          </div>
          <button
            onClick={() => router.push('/empresas')}
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
          <div className="np-steps" style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {STEPS.map((s, i) => {
              const done = step > s.n;
              const active = step === s.n;
              return (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'unset' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? tk.stepDone : active ? tk.stepActive : tk.stepInactive,
                      color: done || active ? '#fff' : tk.textMuted,
                      fontSize: '12px', fontWeight: '600', flexShrink: 0,
                      transition: 'all 0.2s',
                      border: active ? `2px solid ${tk.stepActive}` : done ? `2px solid ${tk.stepDone}` : `2px solid ${tk.stepInactive}`,
                      boxShadow: active ? `0 0 0 4px ${tk.accent}20` : 'none',
                    }}>
                      {done ? Ic.check : s.n}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: active ? tk.text : done ? tk.success : tk.textMuted }}>
                        {s.label}
                      </span>
                      <span style={{ fontSize: '11px', color: tk.textMuted }}>{s.desc}</span>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="np-connector" style={{ flex: 1, height: '2px', margin: '0 12px', background: done ? tk.stepDone : tk.stepInactive, borderRadius: '2px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text, letterSpacing: '-0.01em' }}>
                {STEPS[step - 1].label}
              </div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>
                {step === 1 && 'Informe dados cadastrais e identidade visual.'}
                {step === 2 && 'Confirme o endereço fiscal completo.'}
                {step === 3 && 'Defina os canais de contato da empresa.'}
              </div>
            </div>
            <span style={{ fontSize: '11.5px', color: tk.textMuted, background: tk.chipBg, padding: '4px 10px', borderRadius: '20px' }}>
              Etapa {step} de {STEPS.length}
            </span>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {step === 1 && (
              <>
                <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Razão Social *" tk={tk}>
                    <Input value={legalName} onChange={setLegalName} placeholder="Razão Social" tk={tk} />
                  </Field>
                  <Field label="Nome da empresa *" tk={tk}>
                    <Input value={tradeName} onChange={setTradeName} placeholder="Nome fantasia" tk={tk} />
                  </Field>
                </div>
                <Field label="CNPJ *" tk={tk}>
                  <Input value={cnpj} onChange={(value) => setCnpj(formatCnpj(value))} placeholder="00.000.000/0000-00" tk={tk} />
                </Field>
                <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Cor primária" tk={tk}>
                    <Input value={primaryColor} onChange={setPrimaryColor} placeholder="#2563eb" tk={tk} />
                  </Field>
                  <Field label="Logo" tk={tk} hint="Envie um PNG/JPG com fundo transparente.">
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
                        setLogoFile(file);
                      }}
                      style={{
                        border: `1px dashed ${dragActive ? tk.accent : tk.border}`,
                        background: dragActive ? `${tk.accent}12` : tk.inputMuted,
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <input
                        id="company-logo"
                        type="file"
                        accept="image/*"
                        onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                        style={{ display: 'none' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '10px',
                          background: tk.surfaceAlt, border: `1px solid ${tk.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                          {logoPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '12px', color: tk.textSub }}>Logo</span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: tk.textSub }}>
                          {logoFile ? logoFile.name : 'Arraste ou selecione o arquivo'}
                        </div>
                      </div>
                      <label
                        htmlFor="company-logo"
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
              </>
            )}

            {step === 2 && (
              <>
                <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="CEP *" tk={tk}>
                    <Input value={addressCep} onChange={handleCepLookup} placeholder="00000-000" tk={tk} />
                  </Field>
                  <Field label="Número *" tk={tk}>
                    <Input value={addressNumber} onChange={setAddressNumber} placeholder="Número" tk={tk} />
                  </Field>
                </div>
                {cepInfo ? <p style={{ fontSize: '12px', color: tk.textSub }}>{cepInfo}</p> : null}
                <Field label="Logradouro" tk={tk}>
                  <Input value={addressStreet} onChange={setAddressStreet} placeholder="Rua, avenida" tk={tk} />
                </Field>
                <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Bairro" tk={tk}>
                    <Input value={addressNeighborhood} onChange={setAddressNeighborhood} placeholder="Bairro" tk={tk} />
                  </Field>
                  <Field label="Complemento" tk={tk}>
                    <Input value={addressComplement} onChange={setAddressComplement} placeholder="Complemento" tk={tk} />
                  </Field>
                </div>
                <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Cidade" tk={tk}>
                    <Input value={addressCity} onChange={setAddressCity} placeholder="Cidade" tk={tk} />
                  </Field>
                  <Field label="UF" tk={tk}>
                    <Input value={addressState} onChange={(value) => setAddressState(value.toUpperCase().slice(0, 2))} placeholder="UF" tk={tk} />
                  </Field>
                </div>
              </>
            )}

            {step === 3 && (
              <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Email de contato" tk={tk}>
                  <Input value={contactEmail} onChange={setContactEmail} placeholder="email@empresa.com" tk={tk} />
                </Field>
                <Field label="Telefone" tk={tk}>
                  <Input value={contactPhone} onChange={setContactPhone} placeholder="(00) 00000-0000" tk={tk} />
                </Field>
              </div>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderTop: `1px solid ${tk.border}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            {step > 1 ? (
              <button
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                style={{
                  padding: '8px 14px', background: tk.surface,
                  border: `1px solid ${tk.border}`, borderRadius: '8px',
                  color: tk.textSub, cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--np-font)',
                }}
              >
                Voltar
              </button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                disabled={step === 1 ? !canContinueStep1 : !canContinueStep2}
                style={{
                  padding: '9px 16px',
                  background: step === 1 ? (canContinueStep1 ? tk.accent : tk.disabledBg) : (canContinueStep2 ? tk.accent : tk.disabledBg),
                  border: `1px solid ${step === 1 ? (canContinueStep1 ? tk.accent : tk.border) : (canContinueStep2 ? tk.accent : tk.border)}`,
                  color: step === 1 ? (canContinueStep1 ? '#fff' : tk.textMuted) : (canContinueStep2 ? '#fff' : tk.textMuted),
                  borderRadius: '8px',
                  cursor: step === 1 ? (canContinueStep1 ? 'pointer' : 'not-allowed') : (canContinueStep2 ? 'pointer' : 'not-allowed'),
                  fontSize: '13px',
                  fontWeight: '600',
                  fontFamily: 'var(--np-font)',
                }}
              >
                Próxima etapa
              </button>
            ) : (
              <button
                onClick={createCompany}
                style={{
                  padding: '9px 16px', background: tk.accent, border: `1px solid ${tk.accent}`,
                  color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--np-font)'
                }}
              >
                Salvar empresa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
