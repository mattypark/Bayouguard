'use client';

/* "Is it safe to drive?" — the urgent question, answered first and largest.
 * Icon + words + colour, never colour alone. */

import type { DriveVerdict, Tier } from '@/lib/types';
import { TIER_INK, TIER_TINT } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

const TONE: Record<DriveVerdict['state'], Tier> = { YES: 'LOW', CAUTION: 'MEDIUM', NO: 'HIGH' };

function Icon({ state, large }: { state: DriveVerdict['state']; large?: boolean }) {
  const size = large ? 'h-10 w-10' : 'h-8 w-8';
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (state === 'YES') {
    return (
      <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden>
        <circle cx="12" cy="12" r="9.5" {...common} />
        <path d="m7.5 12.5 3 3 6-6.5" {...common} />
      </svg>
    );
  }
  if (state === 'CAUTION') {
    return (
      <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden>
        <path d="M12 3.5 2.5 20h19L12 3.5z" {...common} />
        <path d="M12 10v4.5M12 17.2v.01" {...common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden>
      <path d="M8 2.5h8L21.5 8v8L16 21.5H8L2.5 16V8L8 2.5z" {...common} />
      <path d="m9 9 6 6M15 9l-6 6" {...common} />
    </svg>
  );
}

export default function DriveCard({ drive, large = false }: { drive: DriveVerdict; large?: boolean }) {
  const { t } = useI18n();
  const tone = TONE[drive.state];
  return (
    <section
      aria-labelledby="drive-q"
      className={`rounded-xl border-l-4 ${large ? 'p-5' : 'p-4'}`}
      style={{ borderColor: TIER_INK[tone], background: TIER_TINT[tone] }}
    >
      <p id="drive-q" className={`font-medium text-ob-text ${large ? 'text-[1rem]' : 'text-[0.75rem]'}`}>
        {t('insp.roads')}
      </p>
      <div className="mt-1 flex items-center gap-3" style={{ color: TIER_INK[tone] }}>
        <Icon state={drive.state} large={large} />
        <p className={`font-bold leading-tight tracking-[-0.01em] ${large ? 'text-[2rem]' : 'text-[1.5rem]'}`}>{t(`drive.${drive.state}`)}</p>
      </div>
      <p className={`mt-1.5 leading-snug text-ob-text ${large ? 'text-[1.125rem]' : 'text-[0.875rem]'}`}>{t(`drive.${drive.state}.msg`)}</p>
    </section>
  );
}
