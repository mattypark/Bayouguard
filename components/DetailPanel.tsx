'use client';

/* Flood detail panel that rides over the map. Risk header + weather + drive
 * verdict + nearest gauges. Slides from the left on desktop, bottom on mobile. */

import type { HomeSnapshot, Tier, DriveVerdict } from '@/lib/types';

const TIER_COLOR: Record<Tier, string> = {
  LOW: '#1B5E20',
  MEDIUM: '#E65100',
  HIGH: '#B71C1C',
  CRITICAL: '#4A148C',
};

const TIER_TINT: Record<Tier, string> = {
  LOW: '#E8F5E9',
  MEDIUM: '#FFF3E0',
  HIGH: '#FFEBEE',
  CRITICAL: '#F3E5F5',
};

const DRIVE_LABEL: Record<DriveVerdict['state'], string> = {
  YES: 'Safe to drive',
  CAUTION: 'Drive with caution',
  NO: 'Do not drive',
};

const DRIVE_COLOR: Record<DriveVerdict['state'], string> = {
  YES: '#1B5E20',
  CAUTION: '#E65100',
  NO: '#B71C1C',
};

export default function DetailPanel({ snap }: { snap: HomeSnapshot }) {
  const { risk, weather, drive, bayous } = snap;
  const tint = TIER_TINT[risk.tier];
  const color = TIER_COLOR[risk.tier];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      {/* Risk header */}
      <section
        className="rounded-2xl border p-4"
        style={{ backgroundColor: tint, borderColor: color }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cs-steel">
          Flood risk
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-serif text-3xl leading-none" style={{ color }}>
            {risk.tier}
          </span>
          <span className="text-sm font-semibold text-cs-midnight/70">
            {risk.score}/100
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-cs-midnight/90">{risk.message}</p>
        <p className="mt-2 truncate text-xs text-cs-steel" title={risk.address}>
          📍 {risk.address}
        </p>
      </section>

      {/* Weather + drive */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-2xl border border-cs-border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cs-steel">
            Weather
          </p>
          <p className="mt-1 font-serif text-2xl text-cs-navy">{weather.tempF}°F</p>
          <p className="text-sm text-cs-midnight/80">{weather.conditions}</p>
          <p className="mt-1 text-xs text-cs-steel">
            Wind {weather.windMph} mph · Humidity {weather.humidity}%
          </p>
        </section>

        <section className="rounded-2xl border border-cs-border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cs-steel">
            Roads
          </p>
          <p
            className="mt-1 font-serif text-xl leading-tight"
            style={{ color: DRIVE_COLOR[drive.state] }}
          >
            {DRIVE_LABEL[drive.state]}
          </p>
          <p className="mt-1 text-xs leading-snug text-cs-midnight/80">{drive.message}</p>
        </section>
      </div>

      {/* Nearest gauges */}
      <section className="rounded-2xl border border-cs-border bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cs-steel">
          Nearest gauges
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {bayous.map((b) => {
            const pct = b.flood > 0 ? Math.min(100, (b.stage / b.flood) * 100) : 0;
            const barColor =
              pct >= 90 ? '#B71C1C' : pct >= 70 ? '#E65100' : '#1B5E20';
            return (
              <li key={b.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-cs-midnight">{b.name}</span>
                  <span className="text-cs-steel">
                    {b.stage} / {b.flood} ft
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-cs-sky">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-auto text-[11px] leading-snug text-cs-steel">
        Live data from Harris County Flood Warning System. Not a substitute for
        official alerts from Harris County or the National Weather Service.
      </p>
    </div>
  );
}
