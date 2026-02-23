'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEYS = {
  fontScale: 'a11y_font_scale',
  reduceMotion: 'a11y_reduce_motion',
  highContrast: 'a11y_high_contrast',
  underlineLinks: 'a11y_underline_links',
  focusRing: 'a11y_focus_ring',
  spacing: 'a11y_text_spacing'
} as const;

type AccessibilityContextValue = {
  largeText: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  underlineLinks: boolean;
  focusRing: boolean;
  wideSpacing: boolean;
  setLargeText: (value: boolean | ((prev: boolean) => boolean)) => void;
  setReduceMotion: (value: boolean | ((prev: boolean) => boolean)) => void;
  setHighContrast: (value: boolean | ((prev: boolean) => boolean)) => void;
  setUnderlineLinks: (value: boolean | ((prev: boolean) => boolean)) => void;
  setFocusRing: (value: boolean | ((prev: boolean) => boolean)) => void;
  setWideSpacing: (value: boolean | ((prev: boolean) => boolean)) => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [underlineLinks, setUnderlineLinks] = useState(false);
  const [focusRing, setFocusRing] = useState(false);
  const [wideSpacing, setWideSpacing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedFont = window.localStorage.getItem(STORAGE_KEYS.fontScale);
    const storedMotion = window.localStorage.getItem(STORAGE_KEYS.reduceMotion);
    const storedContrast = window.localStorage.getItem(STORAGE_KEYS.highContrast);
    const storedUnderline = window.localStorage.getItem(STORAGE_KEYS.underlineLinks);
    const storedFocusRing = window.localStorage.getItem(STORAGE_KEYS.focusRing);
    const storedSpacing = window.localStorage.getItem(STORAGE_KEYS.spacing);

    if (storedFont === 'lg') setLargeText(true);

    if (storedMotion === 'true') {
      setReduceMotion(true);
    } else if (storedMotion === 'false') {
      setReduceMotion(false);
    } else {
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      setReduceMotion(Boolean(prefersReduced));
    }

    setHighContrast(storedContrast === 'true');
    setUnderlineLinks(storedUnderline === 'true');
    setFocusRing(storedFocusRing === 'true');
    setWideSpacing(storedSpacing === 'wide');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (largeText) {
      root.setAttribute('data-font-scale', 'lg');
      window.localStorage.setItem(STORAGE_KEYS.fontScale, 'lg');
    } else {
      root.removeAttribute('data-font-scale');
      window.localStorage.removeItem(STORAGE_KEYS.fontScale);
    }

    if (reduceMotion) {
      root.setAttribute('data-reduce-motion', 'true');
      window.localStorage.setItem(STORAGE_KEYS.reduceMotion, 'true');
    } else {
      root.removeAttribute('data-reduce-motion');
      window.localStorage.setItem(STORAGE_KEYS.reduceMotion, 'false');
    }

    if (highContrast) {
      root.setAttribute('data-contrast', 'high');
      window.localStorage.setItem(STORAGE_KEYS.highContrast, 'true');
    } else {
      root.removeAttribute('data-contrast');
      window.localStorage.removeItem(STORAGE_KEYS.highContrast);
    }

    if (underlineLinks) {
      root.setAttribute('data-underline-links', 'true');
      window.localStorage.setItem(STORAGE_KEYS.underlineLinks, 'true');
    } else {
      root.removeAttribute('data-underline-links');
      window.localStorage.removeItem(STORAGE_KEYS.underlineLinks);
    }

    if (focusRing) {
      root.setAttribute('data-focus-ring', 'strong');
      window.localStorage.setItem(STORAGE_KEYS.focusRing, 'true');
    } else {
      root.removeAttribute('data-focus-ring');
      window.localStorage.removeItem(STORAGE_KEYS.focusRing);
    }

    if (wideSpacing) {
      root.setAttribute('data-spacing', 'wide');
      window.localStorage.setItem(STORAGE_KEYS.spacing, 'wide');
    } else {
      root.removeAttribute('data-spacing');
      window.localStorage.removeItem(STORAGE_KEYS.spacing);
    }
  }, [largeText, reduceMotion, highContrast, underlineLinks, focusRing, wideSpacing]);

  const value = useMemo(
    () => ({
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
      setWideSpacing
    }),
    [
      largeText,
      reduceMotion,
      highContrast,
      underlineLinks,
      focusRing,
      wideSpacing
    ]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}
