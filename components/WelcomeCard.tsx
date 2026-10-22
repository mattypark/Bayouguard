'use client';

/* First visit, nothing searched yet: what BayouGuard does, three places to
 * try, and "Use my location". */

import { useI18n } from '@/lib/i18n';

export const EXAMPLES = [
  { label: 'Meyerland', query: 'Meyerland, Houston, TX', lat: 29.6791, lng: -95.468 },
  { label: 'Memorial Park', query: 'Memorial Park, Houston, TX', lat: 29.765, lng: -95.441 },
  { label: 'Alief', query: 'Alief, Houston, TX', lat: 29.6919, lng: -95.588 },
];

export default function WelcomeCard({
  onPick,
  onLocate,
  onClose,
  locating,
}: {
  onPick: (query: string, coords: { lat: number; lng: number }) => void;
  onLocate: () => void;
  onClose: () => void;
  locating: boolean;
}) {
  const { t } = useI18n();
  return (
    <section className="ob-panel ob-float reveal pointer-events-auto relative w-full max-w-md rounded-xl p-4 pr-14" aria-labelledby="welcome-title">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('welcome.close')}
        className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full text-[1.375rem] leading-none text-ob-muted transition-colors hover:bg-ob-bg hover:text-ob-text"
      >
        ×
      </button>
      <h2 id="welcome-title" className="text-[0.9375rem] font-semibold text-ob-text">
        {t('welcome.title')}
      </h2>
      <p className="mt-1 text-[0.8125rem] leading-relaxed text-ob-muted">{t('welcome.body')}</p>
      <p className="mt-3 text-[0.75rem] font-medium text-ob-muted">{t('welcome.try')}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e.label}
            type="button"
            onClick={() => onPick(e.query, { lat: e.lat, lng: e.lng })}
            className="h-11 rounded-full border border-ob-border bg-ob-surface px-4 text-[0.8125rem] font-semibold text-ob-accent transition-colors hover:bg-ob-bg"
          >
            {e.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onLocate}
        disabled={locating}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ob-accent text-[0.875rem] font-semibold text-ob-onaccent transition hover:brightness-110 disabled:opacity-70"
      >
        <LocateIcon />
        {locating ? t('locate.finding') : t('locate.useMine')}
      </button>
    </section>
  );
}

export function LocateIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
