'use client';

import { useMemo } from 'react';
import { useAccessibility } from '../../../lib/accessibility';

export default function AcessibilidadePage() {
  const {
    largeText,
    reduceMotion,
    highContrast,
    underlineLinks,
    focusRing,
    wideSpacing,
    setLargeText,
    setReduceMotion,
    setHighContrast,
    setUnderlineLinks,
    setFocusRing,
    setWideSpacing,
  } = useAccessibility();

  const tk = useMemo(() => ({
    bg: 'var(--bg)',
    surface: 'var(--card)',
    border: 'var(--border)',
    text: 'var(--ink)',
    textSub: 'var(--muted)',
    shadow: 'var(--shadow)'
  }), []);

  return (
    <div style={{ padding: 0, background: tk.bg, minHeight: '100%', fontFamily: 'var(--pl-font)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        :root { --pl-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }
      `}</style>

      <div style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: tk.text, letterSpacing: '-0.03em', margin: 0 }}>Acessibilidade</h1>
            <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>
              Personalize o sistema para leitura e navegação mais confortáveis.
            </p>
          </div>
        </div>

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '20px 24px', boxShadow: tk.shadow, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            {
              label: 'Texto maior',
              desc: 'Aumenta o tamanho base das fontes em toda a plataforma.',
              checked: largeText,
              onToggle: () => setLargeText((prev) => !prev),
              aria: 'Alternar texto maior'
            },
            {
              label: 'Reduzir movimentos',
              desc: 'Diminui animações e transições para evitar desconforto visual.',
              checked: reduceMotion,
              onToggle: () => setReduceMotion((prev) => !prev),
              aria: 'Alternar redução de movimentos'
            },
            {
              label: 'Alto contraste',
              desc: 'Aumenta contraste de cores para facilitar a leitura.',
              checked: highContrast,
              onToggle: () => setHighContrast((prev) => !prev),
              aria: 'Alternar alto contraste'
            },
            {
              label: 'Sublinhar links',
              desc: 'Destaca links para facilitar a identificação.',
              checked: underlineLinks,
              onToggle: () => setUnderlineLinks((prev) => !prev),
              aria: 'Alternar sublinhado em links'
            },
            {
              label: 'Foco destacado',
              desc: 'Realça o foco do teclado em botões e links.',
              checked: focusRing,
              onToggle: () => setFocusRing((prev) => !prev),
              aria: 'Alternar foco destacado'
            },
            {
              label: 'Espaçamento extra',
              desc: 'Aumenta o espaçamento entre linhas e letras.',
              checked: wideSpacing,
              onToggle: () => setWideSpacing((prev) => !prev),
              aria: 'Alternar espaçamento extra'
            },
          ].map((item, idx) => (
            <div key={item.label}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: tk.text }}>{item.label}</div>
                  <p style={{ fontSize: '13.5px', color: tk.textSub, marginTop: '4px' }}>{item.desc}</p>
                </div>
                <button
                  type="button"
                  className={`sb-switch${item.checked ? ' on' : ''}`}
                  aria-pressed={item.checked}
                  aria-label={item.aria}
                  onClick={item.onToggle}
                >
                  <span className="sb-switch-thumb" />
                </button>
              </div>
              {idx < 5 && <div style={{ height: '1px', background: tk.border, opacity: 0.6, marginTop: '16px' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: tk.shadow, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: 600, color: tk.text }}>Dicas rápidas</div>
          <ul style={{ paddingLeft: '18px', color: tk.textSub, fontSize: '0.9rem', lineHeight: 1.6 }}>
            <li>Use Tab para navegar e Enter para ativar botões.</li>
            <li>As configurações ficam salvas neste navegador.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
