'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest, apiUpload, fileUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

type Company = {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  addressCep?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  enablePdv?: boolean;
  enableMarketplace?: boolean;
};

type PlatformSettings = {
  platformName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
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

const sanitizeCep = (value: string) => value.replace(/\D/g, '').slice(0, 8);

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
    inputMuted: 'var(--surface)',
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

export default function EmpresaConfigPage() {
  const { token, user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [initialCompanyId, setInitialCompanyId] = useState<string | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepInfo, setCepInfo] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressCep, setAddressCep] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [enablePdv, setEnablePdv] = useState(false);
  const [enableMarketplace, setEnableMarketplace] = useState(false);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('companyId');
    if (id) {
      setInitialCompanyId(id);
      setSelectedCompanyId(id);
    }
  }, []);

  const loadPlatformSettings = async () => {
    if (!token) return;
    const data = await apiRequest<PlatformSettings>('/platform-settings', {}, token);
    setPlatformSettings(data);
  };

  const loadCompanies = async () => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    const data = await apiRequest<Company[]>('/companies', {}, token);
    setCompanies(data);
    if (initialCompanyId) {
      const exists = data.some((item) => item.id === initialCompanyId);
      if (exists) {
        setSelectedCompanyId(initialCompanyId);
        return;
      }
    }
    if (!selectedCompanyId && data.length) {
      setSelectedCompanyId(data[0].id);
    }
  };

  const loadCompany = async () => {
    if (!token) return;
    if (user?.role === 'SUPER_ADMIN') {
      if (!selectedCompanyId) return;
      const data = await apiRequest<Company>(`/companies/${selectedCompanyId}`, {}, token);
      setCompany(data);
      return;
    }
    const data = await apiRequest<Company>('/companies/me', {}, token);
    setCompany(data);
  };

  useEffect(() => {
    loadPlatformSettings();
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCompanyId, user?.role]);

  useEffect(() => {
    if (!company) return;
    setLegalName(company.legalName || '');
    setTradeName(company.tradeName || '');
    setCnpj(formatCnpj(company.cnpj || ''));
    setPrimaryColor(company.primaryColor || '');
    setContactEmail(company.contactEmail || '');
    setContactPhone(company.contactPhone || '');
    setAddressCep(company.addressCep || '');
    setAddressStreet(company.addressStreet || '');
    setAddressNumber(company.addressNumber || '');
    setAddressComplement(company.addressComplement || '');
    setAddressNeighborhood(company.addressNeighborhood || '');
    setAddressCity(company.addressCity || '');
    setAddressState(company.addressState || '');
    setEnablePdv(Boolean(company.enablePdv));
    setEnableMarketplace(Boolean(company.enableMarketplace));
  }, [company]);

  const handleCepLookup = async (value: string) => {
    const normalized = sanitizeCep(value);
    setAddressCep(normalized);
    setCepInfo('');
    if (normalized.length !== 8) return;
    try {
      setCepLoading(true);
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
    } finally {
      setCepLoading(false);
    }
  };

  const saveCompany = async () => {
    if (!token || !company) return;
    setMessage('');
    setError('');
    try {
      const payload = {
        legalName: legalName.trim(),
        tradeName: tradeName.trim(),
        cnpj: cnpj.replace(/\D/g, ''),
        primaryColor: primaryColor.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        addressCep: addressCep.trim() || undefined,
        addressStreet: addressStreet.trim() || undefined,
        addressNumber: addressNumber.trim() || undefined,
        addressComplement: addressComplement.trim() || undefined,
        addressNeighborhood: addressNeighborhood.trim() || undefined,
        addressCity: addressCity.trim() || undefined,
        addressState: addressState.trim() || undefined,
        enablePdv,
        enableMarketplace
      };

      if (user?.role === 'SUPER_ADMIN') {
        await apiRequest(`/companies/${company.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      } else {
        await apiRequest('/companies/me', { method: 'PUT', body: JSON.stringify(payload) }, token);
      }

      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        const uploadPath = user?.role === 'SUPER_ADMIN' ? `/companies/${company.id}/logo` : '/companies/me/logo';
        await apiUpload(uploadPath, formData, token);
        setLogoFile(null);
      }

      setMessage('Empresa atualizada.');
      await loadCompany();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar empresa');
    }
  };

  const companyLogo = useMemo(() => {
    if (logoPreview) return logoPreview;
    if (company?.logoUrl) return fileUrl(company.logoUrl);
    return '';
  }, [logoPreview, company?.logoUrl]);

  if (!user) {
    return null;
  }

  if (!company) {
    return (
      <div style={{ background: tk.bg, minHeight: '100%', padding: 0, fontFamily: 'var(--np-font)' }}>
        <div style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em' }}>Configurações da empresa</div>
            <div style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Atualize dados cadastrais, endereço e preferências fiscais.</div>
          </div>
          <div className="empty-state">
            <strong>Carregando empresa</strong>
            <span>Estamos buscando os dados da empresa selecionada.</span>
          </div>
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em' }}>Configurações da empresa</div>
            <div style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>Atualize dados cadastrais, endereço e preferências fiscais.</div>
          </div>
          <button
            onClick={saveCompany}
            style={{
              padding: '9px 16px', background: tk.accent, border: `1px solid ${tk.accent}`,
              color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--np-font)'
            }}
          >
            Salvar alterações
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

        {user.role === 'SUPER_ADMIN' ? (
          <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: tk.shadow }}>
            <Field label="Empresa" tk={tk}>
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 13px',
                  background: tk.inputBg,
                  border: `1px solid ${tk.inputBorder}`,
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  color: tk.text,
                  fontFamily: 'var(--np-font)',
                }}
              >
                {companies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.tradeName}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}

        {platformSettings ? (
          <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: tk.shadow }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: tk.text }}>Contato da plataforma</div>
            <div style={{ fontSize: '12px', color: tk.textSub, marginTop: '4px' }}>
              {platformSettings.platformName} · {platformSettings.contactEmail || 'Sem email'} ·{' '}
              {platformSettings.contactPhone || 'Sem telefone'}
            </div>
          </div>
        ) : null}

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Dados da empresa</div>
            <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Atualize identidade, contatos e endereço.</div>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Razão social" tk={tk}>
                <Input value={legalName} onChange={setLegalName} placeholder="Razão social" tk={tk} />
              </Field>
              <Field label="Nome da empresa" tk={tk}>
                <Input value={tradeName} onChange={setTradeName} placeholder="Nome da empresa" tk={tk} />
              </Field>
            </div>
            <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="CNPJ" tk={tk}>
                <Input value={cnpj} onChange={(value) => setCnpj(formatCnpj(value))} placeholder="CNPJ" tk={tk} />
              </Field>
              <Field label="Cor primária" tk={tk}>
                <Input value={primaryColor} onChange={setPrimaryColor} placeholder="#2563eb" tk={tk} />
              </Field>
            </div>
            <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Email de contato" tk={tk}>
                <Input value={contactEmail} onChange={setContactEmail} placeholder="Email de contato" tk={tk} />
              </Field>
              <Field label="Telefone" tk={tk}>
                <Input value={contactPhone} onChange={setContactPhone} placeholder="Telefone" tk={tk} />
              </Field>
            </div>

            <Field label="Logo" tk={tk} hint="Arraste ou selecione a imagem da empresa.">
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
                    {companyLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={companyLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
        </div>

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Endereço</div>
            <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Preencha o endereço fiscal da empresa.</div>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="np-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="CEP" tk={tk}>
                <Input value={addressCep} onChange={handleCepLookup} placeholder="CEP" tk={tk} />
              </Field>
              <Field label="Número" tk={tk}>
                <Input value={addressNumber} onChange={setAddressNumber} placeholder="Número" tk={tk} />
              </Field>
            </div>
            {cepLoading ? <span style={{ fontSize: '12px', color: tk.textSub }}>Consultando CEP...</span> : null}
            {cepInfo ? <span style={{ fontSize: '12px', color: tk.textSub }}>{cepInfo}</span> : null}
            <Field label="Logradouro" tk={tk}>
              <Input value={addressStreet} onChange={setAddressStreet} placeholder="Logradouro" tk={tk} />
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
          </div>
        </div>

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Configurações fiscais</div>
            <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Acesse as telas de alíquotas e regras fiscais.</div>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a className="btn ghost" href="/aliquotas">Alíquotas UF</a>
            <a className="btn ghost" href="/regras-fiscais">Regras fiscais</a>
            <a className="btn ghost" href="/simulador">Simulador</a>
          </div>
        </div>

        {user.role === 'SUPER_ADMIN' ? (
          <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tk.shadow }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tk.border}` }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tk.text }}>Recursos da empresa</div>
              <div style={{ fontSize: '12.5px', color: tk.textSub, marginTop: '2px' }}>Defina se a empresa terá acesso a PDV e marketplace.</div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: tk.textSub }}>
                <input type="checkbox" checked={enablePdv} onChange={(event) => setEnablePdv(event.target.checked)} />
                PDV habilitado
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: tk.textSub }}>
                <input type="checkbox" checked={enableMarketplace} onChange={(event) => setEnableMarketplace(event.target.checked)} />
                Marketplace habilitado
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
