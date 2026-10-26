'use client';

import { useMemo } from 'react';
import { useAccessibility } from './accessibility';
import { useTheme } from './theme';

/**
 * Paleta dos gráficos sensível às preferências de acessibilidade.
 * No modo de alto contraste as cores ficam mais saturadas e distantes entre si,
 * as linhas mais grossas e os marcadores sempre visíveis, para que as séries
 * possam ser distinguidas sem depender apenas de matiz.
 */
export function useChartPalette() {
  const { highContrast, reduceMotion } = useAccessibility();
  const { theme } = useTheme();

  return useMemo(() => {
    const dark = theme === 'dark';
    const series = highContrast
      ? dark
        ? ['#93c5fd', '#fde047', '#86efac', '#fca5a5', '#f0abfc', '#ffffff']
        : ['#1d4ed8', '#b45309', '#047857', '#b91c1c', '#6d28d9', '#000000']
      : ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#0ea5e9', '#ef4444', '#94a3b8'];

    return {
      series,
      primary: series[0],
      positive: highContrast ? (dark ? '#86efac' : '#047857') : '#10b981',
      negative: highContrast ? (dark ? '#fca5a5' : '#b91c1c') : '#ef4444',
      grid: highContrast ? (dark ? '#e5e7eb' : '#0f172a') : 'var(--border)',
      axis: highContrast ? 'var(--ink)' : 'var(--muted)',
      strokeWidth: highContrast ? 3 : 2,
      showDots: highContrast,
      /** Tracejado usado para a série de previsão, para não depender só da cor. */
      forecastDash: '6 4',
      animate: !reduceMotion,
      highContrast
    };
  }, [highContrast, reduceMotion, theme]);
}
