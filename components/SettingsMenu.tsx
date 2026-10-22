'use client';

/* Language and theme in one button, for screens too narrow for both
 * controls in the top bar. */

import { useEffect, useRef, useState } from 'react';
import { LANGS, useI18n, type Lang } from '@/lib/i18n';
import type { Mode } from '@/lib/theme';

export const LANG_NAME: Record<Lang, string> = { en: 'English', es: 'Español', vi: 'Tiếng Việt' };

export default function SettingsMenu({
  theme,
  onTheme,
  className = '',
}: {
  theme: Mode;
  onTheme: (m: Mode) => void;
  className?: string;
}) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={t('top.settings')}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="ob-panel ob-float flex h-11 w-11 items-center justify-center rounded-full text-ob-muted transition-colors hover:text-ob-text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="16" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="10" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('top.settings')}
          className="ob-panel ob-float absolute right-0 top-[calc(100%+8px)] z-[95] w-60 rounded-xl p-3"
        >
          <p className="text-[0.75rem] font-medium text-ob-muted">{t('top.language')}</p>
          <div role="radiogroup" aria-label={t('top.language')} className="mt-1.5 flex flex-col gap-1">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                lang={l}
                onClick={() => setLang(l)}
                className={`flex h-11 items-center rounded-lg px-3 text-left text-[0.875rem] transition-colors ${
                  lang === l ? 'bg-ob-accent text-ob-onaccent' : 'text-ob-text hover:bg-ob-bg'
                }`}
              >
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[0.75rem] font-medium text-ob-muted">{t('top.theme')}</p>
          <div role="radiogroup" aria-label={t('top.theme')} className="mt-1.5 grid grid-cols-2 gap-1">
            {(['light', 'dark'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={theme === m}
                onClick={() => onTheme(m)}
                className={`h-11 rounded-lg text-[0.875rem] transition-colors ${
                  theme === m ? 'bg-ob-accent text-ob-onaccent' : 'border border-ob-border text-ob-text hover:bg-ob-bg'
                }`}
              >
                {t(m === 'light' ? 'top.light' : 'top.dark')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
