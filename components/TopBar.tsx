'use client';

/* Top bar: the brand (back to the landing), the address search in the middle,
 * and the view controls — Map/Graph, theme, language — on the right. */

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Mode } from '@/lib/theme';
import BrandMark from './landing/BrandMark';

const LANGS = ['EN', 'ES', 'VI'] as const;
export type Lang = (typeof LANGS)[number];
export type ViewMode = 'graph' | 'map';

interface Props {
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  theme: Mode;
  onToggleTheme: () => void;
  lang: Lang;
  onLang: (l: Lang) => void;
  /** The search box, centred between the brand and the controls on wide screens. */
  search: ReactNode;
}

export default function TopBar({ mode, onMode, theme, onToggleTheme, lang, onLang, search }: Props) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[70]">
      {/* One search instance: its own row on phones, centred in the bar from md up. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 pt-3 md:flex-nowrap md:px-4">
        <Link
          href="/"
          aria-label="BayouGuard home"
          className="ob-panel ob-float pointer-events-auto flex h-11 shrink-0 items-center gap-2 rounded-full px-2.5 text-ob-accent sm:pr-4"
        >
          <BrandMark className="h-6 w-6" />
          <span className="hidden text-[17px] font-semibold tracking-[-0.02em] sm:inline">BayouGuard</span>
        </Link>

        <div className="pointer-events-auto order-last flex min-w-0 basis-full justify-center md:order-none md:basis-auto md:flex-1">
          <div className="w-full max-w-xl" data-tour="search">
            {search}
          </div>
        </div>

        <div className="pointer-events-auto ml-auto flex items-center gap-2 md:ml-0">
          <div
            role="group"
            aria-label="View mode"
            className="ob-panel ob-float flex h-11 items-center rounded-full p-1"
          >
            {(['map', 'graph'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMode(m)}
                aria-pressed={mode === m}
                className={`h-9 rounded-full px-3.5 text-[13px] font-semibold capitalize transition-colors ${
                  mode === m ? 'bg-ob-text text-ob-bg' : 'text-ob-muted hover:text-ob-text'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="ob-panel ob-float flex h-11 w-11 items-center justify-center rounded-full text-ob-muted transition-colors hover:text-ob-text"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <div
            role="group"
            aria-label="Language"
            className="ob-panel ob-float hidden h-11 items-center rounded-full p-1 lg:flex"
          >
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLang(l)}
                aria-pressed={lang === l}
                className={`h-9 rounded-full px-2.5 text-[12px] font-semibold transition-colors ${
                  lang === l ? 'bg-ob-text/10 text-ob-text' : 'text-ob-faint hover:text-ob-muted'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
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
