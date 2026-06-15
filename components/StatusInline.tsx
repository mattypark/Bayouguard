'use client';

/* Compact one-line status pill sitting under hero. Color-coded by tier.
 * Shows tier dot + score + one-liner. Designed to feel calm, not alarming. */

import type { Tier } from '@/lib/types';

const DOT: Record<Tier, string> = {
  LOW: '#1B5E20',
  MEDIUM: '#E65100',
  HIGH: '#B71C1C',
  CRITICAL: '#4A148C',
};

export default function StatusInline({
  tier,
  score,
  message,
  updatedAt,
}: {
  tier: Tier;
  score: number;
  message: string;
  updatedAt: string;
}) {
  const time = new Date(updatedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex max-w-full items-center gap-3 rounded-full border border-cs-border bg-white/85 px-4 py-2 text-sm shadow-sm backdrop-blur"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: DOT[tier] }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: DOT[tier] }}
        />
      </span>
      <span className="font-semibold text-cs-midnight">
        {tier} · {score}/100
      </span>
      <span className="hidden text-cs-steel sm:inline">·</span>
      <span className="hidden text-cs-midnight/80 sm:inline">{message}</span>
      <span className="hidden text-cs-steel md:inline">· updated {time}</span>
    </div>
  );
}
