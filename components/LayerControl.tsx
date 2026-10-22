'use client';

import { useI18n } from '@/lib/i18n';

/* Map layer toggles. A checkbox list (the rail supplies the card) that lets
 * the user compose their own view:
 * risk dots, ripples on dangerous gauges, shelters, roads, community reports,
 * reservoirs, wind flow and satellite imagery. Map mode only — the graph
 * background has its own visual language. */

export interface MapLayers {
  dots: boolean;
  ripples: boolean;
  wind: boolean;
  satellite: boolean;
  shelters: boolean;
  roads: boolean;
  reports: boolean;
  reservoirs: boolean;
}

export const DEFAULT_LAYERS: MapLayers = {
  dots: true,
  ripples: true,
  // Decorative and the costliest layer on slow phones; opt in.
  wind: false,
  satellite: false,
  shelters: false,
  roads: false,
  reports: false,
  reservoirs: false,
};

const LAYER_KEYS: Array<keyof MapLayers> = ['dots', 'ripples', 'shelters', 'roads', 'reports', 'reservoirs', 'wind', 'satellite'];

export default function LayerControl({
  layers,
  onChange,
}: {
  layers: MapLayers;
  onChange: (next: MapLayers) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <p className="mb-1 px-2 text-[0.75rem] font-medium text-ob-muted">
        {t('layers.title')}
      </p>
      <ul className="flex flex-col gap-1">
        {LAYER_KEYS.map((key) => {
          const on = layers[key];
          const label = t(`layers.${key}`);
          const hint = t(`layers.${key}.hint`);
          return (
            <li key={key}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                title={hint}
                onClick={() => onChange({ ...layers, [key]: !on })}
                className="group flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-ob-bg"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                    on
                      ? 'border-ob-accent bg-ob-accent'
                      : 'border-ob-border bg-ob-surface'
                  }`}
                >
                  {on && (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="text-ob-onaccent">
                      <path
                        d="M1.5 5.5l2.2 2.2L8.5 2.6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`flex flex-col text-[0.8125rem] leading-tight transition ${
                    on ? 'text-ob-text' : 'text-ob-muted'
                  }`}
                >
                  {label}
                  <span className="text-[0.75rem] text-ob-muted">{hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
