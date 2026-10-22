'use client';

/* Top bar, shared by every page: the wordmark (back to the landing), the four
 * destinations on desktop, the address search on the map, and on the right
 * the data-status pill, Map/Graph, theme and language. Below xl, theme and
 * language fold into one settings button; below lg the destinations move to
 * the bottom tab bar. */

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import type { Mode } from '@/lib/theme';
import type { DataSource } from '@/lib/types';
import { LANGS, useI18n } from '@/lib/i18n';
import BrandMark from './BrandMark';
import DataStatus from './DataStatus';
import SettingsMenu, { LANG_NAME } from './SettingsMenu';
import NavLinks from './nav/NavLinks';

export type ViewMode = 'graph' | 'map';

interface Props {
  theme: Mode;
  onToggleTheme: () => void;
  onTheme: (m: Mode) => void;
  /** Map page only. */
  mode?: ViewMode;
  onMode?: (m: ViewMode) => void;
  dataSource?: DataSource;
  waking?: boolean;
  /** The search box, centred between the brand and the controls on wide screens. */
  search?: ReactNode;
  /** Pages with normal flow (not over a map) pin the bar to the top. */
  floating?: boolean;
  className?: string;
}

export default function TopBar({
  theme,
  onToggleTheme,
  onTheme,
  mode,
  onMode,
  dataSource,
  waking,
  search,
  floating = true,
  className = '',
}: Props) {
  const { lang, setLang, t } = useI18n();
  // Publish the bar's real height: it wraps to more rows in longer languages,
  // and the floating panels below must start under it.
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      document.documentElement.style.setProperty('--topbar-h', `${Math.round(el.getBoundingClientRect().height)}px`),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <header
      ref={bar}
      className={`${floating ? 'pointer-events-none absolute inset-x-0 top-0' : 'sticky top-0 bg-ob-bg/95'} z-[70] ${className}`}
    >
      {/* One search instance: its own row on phones, inline from md up. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-3 md:flex-nowrap md:px-4">
        <Link
          href="/"
          aria-label={t('brand.home')}
          className={`ob-panel ob-float pointer-events-auto flex h-11 shrink-0 items-center gap-2 rounded-full px-2.5 text-ob-accent ${search ? '2xl:pr-4' : 'pr-4'}`}
        >
          <BrandMark className="h-6 w-6" />
          {/* On the map the search needs the room; the wordmark waits for very wide screens. */}
          <span className={`font-display text-[1.1875rem] text-ob-text ${search ? 'hidden 2xl:inline' : ''}`}>BayouGuard</span>
        </Link>

        <NavLinks className="pointer-events-auto hidden shrink-0 lg:block" />

        {search ? (
          <div className="pointer-events-auto order-last flex min-w-0 basis-full justify-center md:order-none md:basis-auto md:flex-1">
            <div className="w-full max-w-xl">
              {search}
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <div className="pointer-events-auto ml-auto flex items-center gap-2 md:ml-0">
          {dataSource && <DataStatus source={dataSource} waking={waking} />}

          {mode && onMode && (
            <div role="group" aria-label={t('top.viewMode')} className="ob-panel ob-float flex h-11 items-center rounded-full p-1">
              {(['map', 'graph'] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onMode(m)}
                  aria-pressed={mode === m}
                  aria-label={t(m === 'map' ? 'top.map' : 'top.graph')}
                  className={`flex h-9 min-w-[40px] items-center justify-center whitespace-nowrap rounded-full px-2.5 text-[0.8125rem] font-semibold transition-colors xl:px-3 ${
                    mode === m ? 'bg-ob-accent text-ob-onaccent' : 'text-ob-muted hover:text-ob-text'
                  }`}
                >
                  <span className="xl:hidden">{m === 'map' ? <MapIcon /> : <GraphIcon />}</span>
                  <span className="hidden xl:inline">{t(m === 'map' ? 'top.map' : 'top.graph')}</span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={t(theme === 'dark' ? 'top.themeToLight' : 'top.themeToDark')}
            title={t(theme === 'dark' ? 'top.themeToLight' : 'top.themeToDark')}
            className="ob-panel ob-float hidden h-11 w-11 items-center justify-center rounded-full text-ob-muted transition-colors hover:text-ob-text xl:flex"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <div role="group" aria-label={t('top.language')} className="ob-panel ob-float hidden h-11 items-center rounded-full p-1 xl:flex">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                aria-label={LANG_NAME[l]}
                lang={l}
                className={`h-9 min-w-[36px] rounded-full px-2.5 text-[0.75rem] font-semibold transition-colors ${
                  lang === l ? 'bg-ob-accent text-ob-onaccent' : 'text-ob-muted hover:text-ob-text'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <SettingsMenu theme={theme} onTheme={onTheme} className="xl:hidden" />
        </div>
      </div>
    </header>
  );
}

function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4zM9 4v13M15 6.5v13" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.3 8.2 10.8 16M15.9 7.6 13.2 16M8.5 6.8l7-.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.5A8 8 0 1 1 9.5 4a6.4 6.4 0 0 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
