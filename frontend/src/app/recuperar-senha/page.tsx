'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FloatingInput from '../../components/FloatingInput';
import { apiRequest } from '../../lib/api';
import { fetchPublicPlatformSettings } from '../../lib/platform-settings';

type RequestResetResponse = {
  message: string;
  resetLink?: string | null;
};

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState<string | null>(null);
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

  const handleRequest = async () => {
    setMessage('');
    setResetLink(null);
    try {
      const response = await apiRequest<RequestResetResponse>('/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setMessage(response.message || 'Solicitação enviada.');
      if (response.resetLink) setResetLink(response.resetLink);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao solicitar recuperação');
    }
  };

  if (!emailEnabled) {
    return (
      <main className="login">
        <div className="login-card">
          <p className="eyebrow">{platformName}</p>
          <h1>Recuperar senha</h1>
          <p className="subtitle">A recuperação de senha está desativada.</p>
          <button className="btn ghost" onClick={() => router.push('/login')}>
            Voltar para o login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="login">
      <div className="login-card">
        <p className="eyebrow">{platformName}</p>
        <h1>Recuperar senha</h1>
        <p className="subtitle">Informe seu email para receber instruções.</p>
        <FloatingInput label="Email" placeholder="Email" type="email" value={email} onChange={setEmail} />
        <button className="btn primary" onClick={handleRequest}>
          Enviar instruções
        </button>
        {message ? <p className="message">{message}</p> : null}
        {resetLink ? (
          <div className="card">
            <strong>Link de redefinição</strong>
            <p className="hint">Use este link para concluir a troca de senha.</p>
            <p>{resetLink}</p>
          </div>
        ) : null}
        <button className="btn ghost" onClick={() => router.push('/login')}>
          Voltar para o login
        </button>
      </div>
    </main>
  );
}
