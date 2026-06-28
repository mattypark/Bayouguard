'use client';

/* Live summary of the whole gauge network: total online + a breakdown by risk
 * tier. Sits as a floating strip over the graph. */

import type { GaugePoint, Tier } from '@/lib/types';
import { TIER_COLOR, TIER_LABEL } from '@/lib/theme';

const ORDER: Tier[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function NetworkStats({ gauges }: { gauges: GaugePoint[] }) {
  const counts = ORDER.reduce<Record<Tier, number>>(
    (acc, t) => {
      acc[t] = 0;
      return acc;
    },
    { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  );
  for (const g of gauges) counts[g.tier] = (counts[g.tier] ?? 0) + 1;

  return (
    <div className="ob-panel pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-2 shadow-panel sm:gap-2 sm:px-3">
      <div className="flex flex-col px-2">
        <span className="font-mono text-lg leading-none tabular text-ob-text">
          {gauges.length}
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-ob-faint">
          gauges live
        </span>
      </div>
      <div className="h-8 w-px bg-ob-border" />
      <ul className="flex items-center gap-1 sm:gap-1.5">
        {ORDER.map((t) => (
          <li
            key={t}
            className="flex items-center gap-1.5 rounded-lg px-1.5 py-1"
            aria-label={`${TIER_LABEL[t]} risk: ${counts[t]} gauges`}
            title={`${TIER_LABEL[t]} risk`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: TIER_COLOR[t],
                boxShadow: `0 0 8px ${TIER_COLOR[t]}`,
              }}
            />
            <span className="font-mono text-sm tabular text-ob-text">
              {counts[t]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
