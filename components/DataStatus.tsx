'use client';

/* Says where the numbers on screen come from. The dot pulses only when the
 * data is live — a pulsing dot over demo numbers would be a lie. */

import { useId, useState } from 'react';
import type { DataSource } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

const DOT: Record<DataSource | 'waking', string> = {
  live: 'bg-tier-low',
  partial: 'bg-tier-med',
  demo: 'bg-ob-faint',
  waking: 'bg-ob-accent',
};

export default function DataStatus({
  source,
  waking,
  className = '',
}: {
  source: DataSource;
  waking?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const state = waking ? 'waking' : source;
  const label = waking ? t('status.waking') : t(`status.${source}`);
  const tip = waking ? t('wake.message') : t(`status.${source}.tip`);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-describedby={tipId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ob-panel ob-float flex h-11 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-medium text-ob-text"
      >
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          {state === 'live' && (
            <span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${DOT[state]}`} />
          )}
          <span className={`relative h-2.5 w-2.5 rounded-full ${DOT[state]}`} />
        </span>
        <span className="whitespace-nowrap">{label}</span>
      </button>
      <p
        id={tipId}
        role="tooltip"
        className={`ob-panel ob-float absolute right-0 top-[calc(100%+8px)] z-[90] w-64 rounded-xl p-3 text-[0.75rem] leading-relaxed text-ob-muted transition-opacity duration-150 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {tip}
      </p>
    </div>
  );
}
