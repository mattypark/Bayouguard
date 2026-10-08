'use client';

/* Right column: the gauges closest to flooding, ranked by how much room is
 * left. Each row's bar is the water level as a share of flood stage, so the
 * ranking and the reason for it read in one glance. Tap a row to fly there. */

import type { GaugePoint } from '@/lib/types';
import { TIER_COLOR, TIER_LABEL } from '@/lib/theme';

const ROWS = 7;

export default function RiskBoard({
  gauges,
  sample,
  onPick,
}: {
  gauges: GaugePoint[];
  sample: boolean;
  onPick: (g: GaugePoint) => void;
}) {
  const ranked = [...gauges].sort((a, b) => a.buffer - b.buffer).slice(0, ROWS);

  return (
    <section className="ob-panel ob-float w-[320px] rounded-2xl p-4" data-tour="board" aria-labelledby="risk-board-title">
      <div className="flex items-baseline justify-between">
        <h2 id="risk-board-title" className="text-[15px] font-semibold tracking-[-0.01em]">
          Closest to flooding
        </h2>
        <span className="text-[11px] text-ob-faint">{sample ? 'sample' : 'live'} · ft to flood stage</span>
      </div>

      {ranked.length === 0 ? (
        <p className="mt-3 text-[13px] text-ob-muted">No gauges match the filters.</p>
      ) : (
        <ol className="mt-3 flex flex-col">
          {ranked.map((g, i) => {
            const pct = g.flood > 0 ? Math.max(0, Math.min(1, g.current / g.flood)) : 0;
            const over = g.buffer <= 0;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onPick(g)}
                  className="group -mx-2 flex w-[calc(100%+16px)] flex-col gap-1.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-ob-bg2"
                  aria-label={`Gauge ${g.id}, ${TIER_LABEL[g.tier]} risk, ${g.buffer.toFixed(1)} feet to flood stage`}
                >
                  <span className="flex items-center gap-2 text-[13px]">
                    <span className="w-4 font-mono text-[11px] text-ob-faint tabular">{i + 1}</span>
                    <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: TIER_COLOR[g.tier] }} />
                    <span className="truncate font-medium">Gauge {g.id}</span>
                    {g.county && <span className="truncate text-[11px] text-ob-faint">{g.county}</span>}
                    <span
                      className="ml-auto font-mono text-[12px] font-semibold tabular"
                      style={{ color: over || g.tier !== 'LOW' ? TIER_COLOR[g.tier] : undefined }}
                    >
                      {over ? `+${Math.abs(g.buffer).toFixed(1)} over` : g.buffer.toFixed(1)}
                    </span>
                  </span>
                  <span className="ml-6 block h-1.5 overflow-hidden rounded-full bg-ob-bg2">
                    <span
                      className="block h-full origin-left rounded-full"
                      style={{ backgroundColor: TIER_COLOR[g.tier], transform: `scaleX(${pct})` }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
