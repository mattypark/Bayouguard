'use client';

/* Flood detail panel that rides over the map view (dark). Risk header + weather
 * + drive verdict + nearest gauges. */

import type { HomeSnapshot, Tier, DriveVerdict } from '@/lib/types';
import { TIER_COLOR, TIER_TINT, TIER_LABEL } from '@/lib/theme';

const DRIVE_LABEL: Record<DriveVerdict['state'], string> = {
  YES: 'Safe to drive',
  CAUTION: 'Drive with caution',
  NO: 'Do not drive',
};

const DRIVE_COLOR: Record<DriveVerdict['state'], string> = {
  YES: TIER_COLOR.LOW,
  CAUTION: TIER_COLOR.MEDIUM,
  NO: TIER_COLOR.HIGH,
};

export default function DetailPanel({ snap }: { snap: HomeSnapshot }) {
  const { risk, weather, drive, bayous } = snap;
  const color = TIER_COLOR[risk.tier];

  return (
    <div className="ob-panel flex h-full flex-col gap-4 overflow-y-auto p-5 thin-scroll md:rounded-r-3xl">
      {/* Risk header */}
      <section
        className="rounded-2xl border p-4"
        style={{ backgroundColor: TIER_TINT[risk.tier], borderColor: color }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ob-faint">
          Flood risk
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-3xl leading-none tabular" style={{ color }}>
            {risk.score}
          </span>
          <span className="text-sm font-semibold" style={{ color }}>
            {TIER_LABEL[risk.tier]}
          </span>
          <span className="ml-auto text-xs text-ob-faint">/ 100</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ob-muted">{risk.message}</p>
        <p className="mt-2 truncate text-xs text-ob-faint" title={risk.address}>
          ⌖ {risk.address}
        </p>
      </section>

      {/* Weather + drive */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-2xl border border-ob-border bg-ob-bg2/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ob-faint">
            Weather
          </p>
          <p className="mt-1 font-mono text-2xl tabular text-ob-text">{weather.tempF}°F</p>
          <p className="text-sm text-ob-muted">{weather.conditions}</p>
          <p className="mt-1 text-xs text-ob-faint">
            Wind {weather.windMph} mph · {weather.humidity}% RH
          </p>
        </section>

        <section
          className="rounded-2xl border bg-ob-bg2/60 p-4"
          style={{ borderColor: DRIVE_COLOR[drive.state] }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ob-faint">
            Roads
          </p>
          <p
            className="mt-1 font-semibold leading-tight"
            style={{ color: DRIVE_COLOR[drive.state] }}
          >
            {DRIVE_LABEL[drive.state]}
          </p>
          <p className="mt-1 text-xs leading-snug text-ob-muted">{drive.message}</p>
        </section>
      </div>

      {/* Nearest gauges */}
      <section className="rounded-2xl border border-ob-border bg-ob-bg2/60 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ob-faint">
          Nearest gauges
        </p>
        <ul className="mt-2 flex flex-col gap-2.5">
          {bayous.map((b) => {
            const pct = b.flood > 0 ? Math.min(100, (b.stage / b.flood) * 100) : 0;
            const barColor =
              pct >= 90
                ? TIER_COLOR.CRITICAL
                : pct >= 70
                  ? TIER_COLOR.HIGH
                  : pct >= 45
                    ? TIER_COLOR.MEDIUM
                    : TIER_COLOR.LOW;
            return (
              <li key={b.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ob-text">{b.name}</span>
                  <span className="font-mono tabular text-ob-muted">
                    {b.stage.toFixed(1)} / {b.flood.toFixed(1)} ft
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ob-bg2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: barColor,
                      boxShadow: `0 0 10px ${barColor}`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-auto text-[11px] leading-snug text-ob-faint">
        Live data from the Harris County Flood Warning System. Not a substitute for
        official alerts from Harris County or the National Weather Service.
      </p>
    </div>
  );
}
