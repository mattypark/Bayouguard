'use client';

/* What the colours and symbols mean, in words. Collapsible; the network
 * summary ("338 gauges · 13 high · 1 critical") rides on the toggle so it's
 * readable even collapsed. */

import { useId, useState } from 'react';
import type { GaugePoint, Tier } from '@/lib/types';
import type { MapLayers } from './LayerControl';
import { TIER_COLOR } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

const ORDER: Tier[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function MapLegend({
  gauges,
  layers,
  demoOverlays,
  defaultOpen = true,
}: {
  gauges: GaugePoint[];
  layers: MapLayers;
  /** Overlays currently showing sample data. */
  demoOverlays: ReadonlySet<keyof MapLayers>;
  defaultOpen?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const titleId = useId();
  let high = 0;
  let critical = 0;
  for (const g of gauges) {
    if (g.tier === 'HIGH') high += 1;
    else if (g.tier === 'CRITICAL') critical += 1;
  }
  const demo = (k: keyof MapLayers) =>
    demoOverlays.has(k) ? <span className="text-ob-muted"> · {t('label.demo')}</span> : null;

  return (
    <section className="ob-panel ob-float w-[248px] max-w-full rounded-xl" aria-labelledby={titleId}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0">
          <span id={titleId} className="block text-[0.75rem] font-medium text-ob-muted">
            {t('legend.title')}
          </span>
          <span className="block text-[0.8125rem] font-medium text-ob-text tabular">
            {t('network.summary', { total: gauges.length, high, critical })}
          </span>
        </span>
        <span aria-hidden className={`text-ob-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 border-t border-ob-border px-3 py-2.5 text-[0.75rem] text-ob-text">
          {ORDER.map((tier) => (
            <li key={tier} className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: TIER_COLOR[tier] }} />
              <span className="font-medium">{t(`tier.${tier}`)}</span>
              <span className="text-ob-muted">{t(`tierHint.${tier}`)}</span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <svg width="12" height="16" viewBox="0 0 26 34" aria-hidden className="shrink-0">
              <path d="M13 0C5.8 0 0 5.8 0 13c0 9 13 21 13 21s13-12 13-21C26 5.8 20.2 0 13 0z" fill="rgb(var(--ob-water-rgb))" />
            </svg>
            {t('legend.address')}
          </li>
          {layers.shelters && (
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-ob-accent text-[0.5625rem] text-ob-onaccent" aria-hidden>
                ▲
              </span>
              <span>
                {t('layers.shelters')}
                {demo('shelters')}
              </span>
            </li>
          )}
          {layers.roads && (
            <li className="flex items-center gap-2">
              <span className="h-0 w-4 shrink-0 border-t-[3px] border-dashed border-tier-high" aria-hidden />
              <span>
                {t('layers.roads')}
                {demo('roads')}
              </span>
            </li>
          )}
          {layers.reports && (
            <li className="flex items-center gap-2">
              <svg width="12" height="16" viewBox="0 0 26 34" aria-hidden className="shrink-0">
                <path d="M13 0C5.8 0 0 5.8 0 13c0 9 13 21 13 21s13-12 13-21C26 5.8 20.2 0 13 0z" fill="rgb(var(--ob-accent-rgb))" />
              </svg>
              <span>
                {t('layers.reports')}
                {demo('reports')}
              </span>
            </li>
          )}
          {layers.reservoirs && (
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-ob-water text-[0.5625rem] font-bold text-white" aria-hidden>
                R
              </span>
              <span>
                {t('layers.reservoirs')}
                {demo('reservoirs')}
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
