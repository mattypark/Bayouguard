'use client';

import { motion } from 'framer-motion';

type Verdict = 'YES' | 'CAUTION' | 'NO';

const STYLES: Record<Verdict, { label: string; bg: string; text: string; ring: string; msg: string }> = {
  YES: {
    label: 'YES — safe to drive',
    bg: 'bg-risk-low-lt',
    text: 'text-risk-low',
    ring: 'ring-risk-low/30',
    msg: 'No closures reported near your address. Conditions clear.',
  },
  CAUTION: {
    label: 'USE CAUTION',
    bg: 'bg-cs-amber-lt',
    text: 'text-cs-amber',
    ring: 'ring-cs-amber/30',
    msg: 'Some low-lying roads may be flooded. Avoid underpasses.',
  },
  NO: {
    label: 'NO — stay home',
    bg: 'bg-risk-high-lt',
    text: 'text-risk-high',
    ring: 'ring-risk-high/30',
    msg: 'Multiple closures reported. Turn around, don\u2019t drown.',
  },
};

export default function SafeToDriveCard({ verdict = 'CAUTION' as Verdict }) {
  const s = STYLES[verdict];
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`rounded-2xl border border-cs-border bg-white p-4 shadow-sm ring-1 ${s.ring} md:p-5`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-cs-steel">
            Is it safe to drive?
          </p>
          <p className={`mt-1 text-2xl font-bold leading-tight md:text-3xl ${s.text}`}>
            {s.label}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-cs-midnight/80">{s.msg}</p>
        </div>
        <span
          className={`hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold sm:flex ${s.bg} ${s.text}`}
          aria-hidden
        >
          {verdict === 'YES' ? '✓' : verdict === 'NO' ? '✕' : '!'}
        </span>
      </div>
    </motion.section>
  );
}
