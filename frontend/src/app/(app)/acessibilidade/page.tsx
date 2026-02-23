'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../../components/PageHeader';

const STORAGE_FONT = 'a11y_font_scale';
const STORAGE_MOTION = 'a11y_reduce_motion';

function useA11ySettings() {
  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedFont = window.localStorage.getItem(STORAGE_FONT);
    const storedMotion = window.localStorage.getItem(STORAGE_MOTION);
    setLargeText(storedFont === 'lg');
    setReduceMotion(storedMotion === 'true');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const root = document.documentElement;
    if (largeText) {
      root.setAttribute('data-font-scale', 'lg');
      window.localStorage.setItem(STORAGE_FONT, 'lg');
    } else {
      root.removeAttribute('data-font-scale');
      window.localStorage.removeItem(STORAGE_FONT);
    }

    if (reduceMotion) {
      root.setAttribute('data-reduce-motion', 'true');
      window.localStorage.setItem(STORAGE_MOTION, 'true');
    } else {
      root.removeAttribute('data-reduce-motion');
      window.localStorage.removeItem(STORAGE_MOTION);
    }
  }, [largeText, reduceMotion]);

  return { largeText, setLargeText, reduceMotion, setReduceMotion };
}

export default function AcessibilidadePage() {
  const { largeText, setLargeText, reduceMotion, setReduceMotion } = useA11ySettings();

  const tk = useMemo(() => ({
    text: 'var(--ink)',
    textSub: 'var(--muted)',
    border: 'var(--border)',
    surface: 'var(--card)',
    shadow: 'var(--shadow)'
  }), []);

  return (
    <div className="page">
      <PageHeader
        title="Acessibilidade"
        subtitle="Personalize o sistema para leitura e navegação mais confortáveis."
      />

      <div className="card" style={{ gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ fontWeight: 600, color: tk.text }}>Texto maior</div>
            <p className="subtitle">Aumenta o tamanho base das fontes em toda a plataforma.</p>
          </div>
          <button
            type="button"
            className={`sb-switch${largeText ? ' on' : ''}`}
            aria-pressed={largeText}
            aria-label="Alternar texto maior"
            onClick={() => setLargeText((prev) => !prev)}
          >
            <span className="sb-switch-thumb" />
          </button>
        </div>

        <div style={{ height: '1px', background: tk.border, opacity: 0.6 }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ fontWeight: 600, color: tk.text }}>Reduzir movimentos</div>
            <p className="subtitle">Diminui animações e transições para evitar desconforto visual.</p>
          </div>
          <button
            type="button"
            className={`sb-switch${reduceMotion ? ' on' : ''}`}
            aria-pressed={reduceMotion}
            aria-label="Alternar redução de movimentos"
            onClick={() => setReduceMotion((prev) => !prev)}
          >
            <span className="sb-switch-thumb" />
          </button>
        </div>
      </div>

      <div className="card" style={{ gap: '12px' }}>
        <div style={{ fontWeight: 600, color: tk.text }}>Dicas rápidas</div>
        <ul style={{ paddingLeft: '18px', color: tk.textSub, fontSize: '0.9rem', lineHeight: 1.6 }}>
          <li>Use Tab para navegar e Enter para ativar botões.</li>
          <li>As configurações ficam salvas neste navegador.</li>
        </ul>
      </div>
    </div>
  );
}
