'use client';

/* Light/dark theme state. Persists to localStorage and reflects the choice onto
 * <html data-theme> so the CSS variables in globals.css switch the whole app. */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Mode } from './theme';

const STORAGE_KEY = 'bayouguard_theme';

export function useTheme(): { mode: Mode; toggle: () => void; setMode: (m: Mode) => void } {
  const [mode, setModeState] = useState<Mode>('light');
  const hydrated = useRef(false);

  // Hydrate from the theme the no-flash script already put on <html>.
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark') setModeState(current);
  }, []);

  // Reflect onto <html> + persist whenever it changes. The first run would
  // write the SSR default over a saved dark theme, so it is skipped.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((m: Mode) => setModeState(m), []);
  const toggle = useCallback(
    () => setModeState((m) => (m === 'light' ? 'dark' : 'light')),
    [],
  );

  return { mode, toggle, setMode };
}
