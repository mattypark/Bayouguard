'use client';

/* Amber strip when the newest gauge reading is over 30 minutes old — the
 * feed may be stuck, and a calm map could be an out-of-date one. */

import { useEffect, useState } from 'react';
import type { GaugePoint } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

const STALE_MS = 30 * 60_000;

export function newestReading(gauges: GaugePoint[]): number | null {
  let newest = 0;
  for (const g of gauges) {
    const t = g.readAt ? Date.parse(g.readAt) : NaN;
    if (Number.isFinite(t) && t > newest) newest = t;
  }
  return newest > 0 ? newest : null;
}

export default function StaleBanner({ gauges }: { gauges: GaugePoint[] }) {
  const { t } = useI18n();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const newest = newestReading(gauges);
  if (now == null || newest == null || now - newest < STALE_MS) return null;
  const minutes = Math.round((now - newest) / 60_000);
  return (
    <p
      role="status"
      className="pointer-events-auto rounded-lg border border-tier-med/50 px-3 py-1.5 text-[0.75rem] font-medium"
      style={{ background: 'var(--tier-med-tint)', color: 'var(--tier-med-ink)' }}
    >
      {minutes >= 120
        ? t('stale.hours', { hours: Math.round(minutes / 60) })
        : t('stale.minutes', { minutes })}
    </p>
  );
}
