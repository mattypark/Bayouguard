'use client';

/* Risk score as a semicircle: 0-100 maps to 0-180°. The arc sweeps in once
 * when a score arrives; its colour eases over 600 ms when the tier changes. */

import type { RiskSnapshot } from '@/lib/types';
import { TIER_COLOR, TIER_INK } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { riskSentence } from '@/lib/describe';
import { TierBadge } from './parts';

const ARC = 'M 12 64 A 52 52 0 0 1 116 64';

export default function RiskArc({ risk, large = false }: { risk: RiskSnapshot; large?: boolean }) {
  const { t, num } = useI18n();
  const sentence = riskSentence(risk, t, num);
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={t('insp.scoreAria', { score: risk.score, tier: t(`tier.${risk.tier}`), source: t(`riskSource.${risk.source}`) })}
    >
      <div className="flex items-end gap-4">
        <div className="relative h-[72px] w-[128px] shrink-0">
          <svg viewBox="0 0 128 72" className="h-full w-full" aria-hidden>
            <path d={ARC} fill="none" stroke="rgb(var(--ob-border-rgb))" strokeWidth="10" strokeLinecap="round" />
            <path
              key={risk.address}
              className="arc-sweep"
              d={ARC}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              pathLength={1}
              style={{
                stroke: TIER_COLOR[risk.tier],
                strokeDasharray: `${Math.max(0.02, risk.score / 100)} 1`,
                transition: 'stroke 600ms ease-out, stroke-dasharray 600ms ease-out',
              }}
            />
          </svg>
          <span
            className="absolute inset-x-0 bottom-0 text-center font-mono text-[2.125rem] font-semibold leading-none tabular"
            style={{ color: TIER_INK[risk.tier], transition: 'color 600ms ease-out' }}
          >
            {risk.score}
          </span>
        </div>
        <div className="min-w-0 pb-0.5">
          <TierBadge tier={risk.tier} />
          <p className="mt-1.5 text-[0.8125rem] text-ob-muted">{t('insp.scoreOf')}</p>
        </div>
      </div>
      <p className={`mt-2 font-medium text-ob-muted ${large ? 'text-[0.9375rem]' : 'text-[0.75rem]'}`}>{t(`riskSource.${risk.source}`)}</p>
      <p className={`mt-2 leading-relaxed text-ob-text ${large ? 'text-[1.0625rem]' : 'text-[0.875rem]'}`} title={risk.backendMessage}>
        {sentence}
      </p>
    </section>
  );
}
