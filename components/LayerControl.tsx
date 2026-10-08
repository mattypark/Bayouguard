'use client';

/* Map layer toggles. A checkbox list (the rail supplies the card) that lets
 * the user compose their own view:
 * plain risk dots, animated "tsunami" ripples, wind flow, satellite imagery,
 * and the statewide USGS context layer. Map mode only — the graph background
 * has its own visual language. */

export interface MapLayers {
  dots: boolean;
  ripples: boolean;
  wind: boolean;
  satellite: boolean;
  usgs: boolean;
}

export const DEFAULT_LAYERS: MapLayers = {
  dots: true,
  ripples: true,
  wind: true,
  satellite: false,
  usgs: true,
};

const LAYER_META: Array<{ key: keyof MapLayers; label: string; hint: string }> = [
  { key: 'dots', label: 'Gauge dots', hint: 'Risk-tier colored gauges' },
  { key: 'ripples', label: 'Ripple FX', hint: 'Pulses scale with risk' },
  { key: 'wind', label: 'Wind flow', hint: 'Live direction of travel' },
  { key: 'satellite', label: 'Satellite', hint: 'Esri imagery basemap' },
  { key: 'usgs', label: 'Statewide USGS', hint: 'All-Texas stream gauges' },
];

export default function LayerControl({
  layers,
  onChange,
}: {
  layers: MapLayers;
  onChange: (next: MapLayers) => void;
}) {
  return (
    <div>
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ob-faint">
        Map layers
      </p>
      <ul className="flex flex-col gap-1">
        {LAYER_META.map(({ key, label, hint }) => {
          const on = layers[key];
          return (
            <li key={key}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                title={hint}
                onClick={() => onChange({ ...layers, [key]: !on })}
                className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-ob-bg2"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                    on
                      ? 'border-ob-accent bg-ob-accent'
                      : 'border-ob-border bg-ob-surface'
                  }`}
                >
                  {on && (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                      <path
                        d="M1.5 5.5l2.2 2.2L8.5 2.6"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`flex flex-col text-[13px] leading-tight transition ${
                    on ? 'text-ob-text' : 'text-ob-muted'
                  }`}
                >
                  {label}
                  <span className="text-[11px] text-ob-faint">{hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
