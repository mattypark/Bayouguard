'use client';

/* Light/dark theme state. Persists to localStorage and reflects the choice onto
 * <html data-theme> so the CSS variables in globals.css switch the whole app. */

import { useCallback, useEffect, useState } from 'react';
import type { Mode } from './theme';

const STORAGE_KEY = 'bayouguard_theme';

export function useTheme(): { mode: Mode; toggle: () => void; setMode: (m: Mode) => void } {
  const [mode, setModeState] = useState<Mode>('dark');

  // Hydrate from storage on mount (SSR defaults to dark).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') setModeState(saved);
  }, []);

  // Reflect onto <html> + persist whenever it changes.
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((m: Mode) => setModeState(m), []);
  const toggle = useCallback(
    () => setModeState((m) => (m === 'dark' ? 'light' : 'dark')),
    [],
  );

  return { mode, toggle, setMode };
}
