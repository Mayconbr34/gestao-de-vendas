'use client';

import { useMemo, useState } from 'react';
import { API_URL } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

export default function DocsPage() {
  const { token } = useAuth();
  const [copied, setCopied] = useState(false);

  const swaggerUrl = useMemo(() => `${API_URL}/docs`, []);

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page">
      <div className="content-header">
        <div>
          <h1>Documentação da API</h1>
          <p className="subtitle">Swagger UI apontando para o backend configurado.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn ghost" onClick={copyToken} disabled={!token}>
            Copiar token JWT
          </button>
          {copied ? <span className="subtitle">Token copiado</span> : null}
        </div>
      </div>

      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          minHeight: '600px'
        }}
      >
        <iframe
          title="Swagger"
          src={swaggerUrl}
          style={{
            width: '100%',
            height: 'calc(100vh - 240px)',
            minHeight: '600px',
            border: 'none',
            background: 'var(--card)'
          }}
        />
      </div>
    </div>
  );
}
