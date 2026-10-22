'use client';

/* The theme currently on <html data-theme>, kept in sync — for components
 * (charts, map icons) that need real colours rather than CSS variables and
 * don't own the theme state. */

import { useEffect, useState } from 'react';
import type { Mode } from './theme';

export function useDocumentTheme(): Mode {
  const [mode, setMode] = useState<Mode>('light');
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setMode(el.dataset.theme === 'dark' ? 'dark' : 'light');
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return mode;
}
