'use client';

/* Left rail: the network at a glance, filters, and map layers.
 *
 * The tier rows are filters *and* counts — from the YCGlobe app rail, where
 * the count beside every facet turns a filter list into a second view of the
 * data. Turning a tier off hides its gauges on the map and the graph. */

import type { GaugePoint, Tier } from '@/lib/types';
import { TIER_COLOR, TIER_LABEL } from '@/lib/theme';
import LayerControl, { type MapLayers } from './LayerControl';

export const TIER_ORDER: Tier[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const TIER_HINT: Record<Tier, string> = {
  CRITICAL: 'At or over flood stage',
  HIGH: 'Within 2.5 ft',
  MEDIUM: 'Within 6 ft',
  LOW: 'Plenty of room',
};

export function countTiers(gauges: GaugePoint[]): Record<Tier, number> {
  const counts: Record<Tier, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const g of gauges) counts[g.tier] += 1;
  return counts;
}

export default function MapRail({
  gauges,
  sample,
  hidden,
  onToggleTier,
  layers,
  onLayers,
  showLayers,
}: {
  gauges: GaugePoint[];
  sample: boolean;
  hidden: ReadonlySet<Tier>;
  onToggleTier: (t: Tier) => void;
  layers: MapLayers;
  onLayers: (next: MapLayers) => void;
  showLayers: boolean;
}) {
  const counts = countTiers(gauges);
  const max = Math.max(1, ...TIER_ORDER.map((t) => counts[t]));

  return (
    <div className="ob-panel ob-float thin-scroll flex max-h-full w-[248px] flex-col overflow-y-auto rounded-2xl">
      <section className="px-4 pb-3 pt-4" data-tour="filters">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ob-faint">Houston-area network</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[28px] font-bold leading-none tracking-[-0.03em] tabular">{gauges.length}</span>
          <span className="text-[13px] text-ob-muted">gauges live</span>
        </p>
        {sample && (
          <p className="mt-2 rounded-lg bg-tier-med/10 px-2 py-1.5 text-[11px] leading-snug text-ob-muted">
            Sample data — the BayouGuard backend isn&rsquo;t connected yet.
          </p>
        )}

        <ul className="mt-3 flex flex-col gap-0.5" aria-label="Filter by risk">
          {TIER_ORDER.map((t) => {
            const on = !hidden.has(t);
            return (
              <li key={t}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => onToggleTier(t)}
                  title={TIER_HINT[t]}
                  className={`group w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-ob-bg2 ${on ? '' : 'opacity-45'}`}
                >
                  <span className="flex items-center gap-2 text-[13px]">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: TIER_COLOR[t] }} />
                    <span className="font-medium text-ob-text">{TIER_LABEL[t]}</span>
                    <span className="ml-auto font-mono text-[12px] tabular text-ob-muted">{counts[t]}</span>
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-ob-bg2">
                    <span
                      className="block h-full origin-left rounded-full transition-transform duration-500"
                      style={{
                        backgroundColor: TIER_COLOR[t],
                        transform: `scaleX(${counts[t] / max})`,
                      }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {showLayers && (
        <section className="border-t border-ob-border px-2 pb-2 pt-3" data-tour="layers">
          <LayerControl layers={layers} onChange={onLayers} />
        </section>
      )}
    </div>
  );
}
