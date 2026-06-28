'use client';

/* Slim top bar: wordmark, live indicator, Graph/Map toggle, theme toggle, lang. */

import type { Mode } from '@/lib/theme';

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
}

export default function TopBar({
  mode,
  onMode,
  theme,
  onToggleTheme,
  lang,
  onLang,
}: Props) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 md:px-6">
        {/* Wordmark */}
        <a href="/" className="pointer-events-auto flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ob-accent opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ob-accent" />
          </span>
          <span className="font-serif text-xl leading-none text-ob-text">
            BayouGuard
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ob-faint sm:inline">
            TX-07 · live
          </span>
        </a>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* View toggle */}
          <div
            role="group"
            aria-label="View mode"
            className="flex items-center rounded-full border border-ob-border bg-ob-surface/70 p-1 backdrop-blur"
          >
            {(['graph', 'map'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMode(m)}
                aria-pressed={mode === m}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  mode === m
                    ? 'bg-ob-accent/20 text-ob-accent'
                    : 'text-ob-muted hover:text-ob-text'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ob-border bg-ob-surface/70 text-ob-muted backdrop-blur transition hover:text-ob-text"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Language */}
          <div
            role="group"
            aria-label="Language"
            className="hidden items-center rounded-full border border-ob-border bg-ob-surface/70 p-1 backdrop-blur sm:flex"
          >
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLang(l)}
                aria-pressed={lang === l}
                className={`rounded-full px-2 py-1 text-[11px] font-semibold transition ${
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.5A8 8 0 1 1 9.5 4a6.4 6.4 0 0 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
