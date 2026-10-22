'use client';

/* Left rail: the network at a glance, filters, and map layers.
 *
 * The tier rows are filters *and* counts — from the YCGlobe app rail, where
 * the count beside every facet turns a filter list into a second view of the
 * data. Turning a tier off hides its gauges on the map and the graph. */

import type { GaugePoint, Tier } from '@/lib/types';
import { TIER_COLOR } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import LayerControl, { type MapLayers } from './LayerControl';
import ReservoirCard from './inspector/ReservoirCard';

export const TIER_ORDER: Tier[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];


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
  const { t } = useI18n();
  const counts = countTiers(gauges);
  const max = Math.max(1, ...TIER_ORDER.map((tier) => counts[tier]));

  return (
    <div className="ob-panel ob-float thin-scroll flex max-h-full w-[248px] flex-col overflow-y-auto rounded-xl">
      <section className="px-4 pb-3 pt-4">
        <p className="text-[0.75rem] font-medium text-ob-muted">{t('rail.network')}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[1.75rem] font-bold leading-none tracking-[-0.03em] tabular">{gauges.length}</span>
          <span className="text-[0.8125rem] text-ob-muted">{t('rail.gauges')}</span>
        </p>
        {sample && (
          <p className="mt-2 rounded-lg bg-tier-med/10 px-2 py-1.5 text-[0.75rem] leading-snug text-ob-muted">
            {t('rail.notLive')}
          </p>
        )}

        <ul className="mt-3 flex flex-col gap-0.5" aria-label={t('rail.filter')}>
          {TIER_ORDER.map((tier) => {
            const on = !hidden.has(tier);
            return (
              <li key={tier}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => onToggleTier(tier)}
                  title={t(`tierHint.${tier}`)}
                  className={`group min-h-[44px] w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-ob-bg ${on ? '' : 'opacity-45'}`}
                >
                  <span className="flex items-center gap-2 text-[0.8125rem]">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: TIER_COLOR[tier] }} />
                    <span className="font-medium text-ob-text">{t(`tier.${tier}`)}</span>
                    <span className="ml-auto font-mono text-[0.75rem] tabular text-ob-muted">{counts[tier]}</span>
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-ob-bg2">
                    <span
                      className="block h-full origin-left rounded-full transition-transform duration-500"
                      style={{
                        backgroundColor: TIER_COLOR[tier],
                        transform: `scaleX(${counts[tier] / max})`,
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
        <section className="border-t border-ob-border px-2 pb-2 pt-3">
          <LayerControl layers={layers} onChange={onLayers} />
        </section>
      )}
      <div className="border-t border-ob-border px-2 py-1">
        <ReservoirCard collapsible />
      </div>
    </div>
  );
}
