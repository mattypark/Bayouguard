'use client';

/* Inspector for the watershed graph. Renders metrics for whatever node is
 * selected: the searched address (full risk + weather + drive + bayous) or a
 * single gauge (level vs flood stage, headroom, distance). */

import type { GraphSelection } from './WatershedGraph';
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

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
      style={{ backgroundColor: TIER_TINT[tier], color: TIER_COLOR[tier] }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: TIER_COLOR[tier], boxShadow: `0 0 8px ${TIER_COLOR[tier]}` }}
      />
      {TIER_LABEL[tier]}
    </span>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-ob-border bg-ob-bg2/60 p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-ob-faint">{label}</p>
      <p className="mt-1 font-mono text-xl tabular text-ob-text">
        {value}
        {unit && <span className="ml-1 text-xs text-ob-muted">{unit}</span>}
      </p>
    </div>
  );
}

function FillBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ob-bg2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
    </div>
  );
}

interface Props {
  selection: GraphSelection | null;
  snapshot: HomeSnapshot;
  center: { lat: number; lng: number } | null;
  switchLabel: string;
  onSwitch: () => void;
  onClose: () => void;
}

export default function InspectorPanel({
  selection,
  snapshot,
  center,
  switchLabel,
  onSwitch,
  onClose,
}: Props) {
  // ── Gauge node ───────────────────────────────────────────────────────────
  if (selection?.kind === 'gauge' && selection.gauge) {
    const g = selection.gauge;
    const fillPct = g.flood > 0 ? (g.current / g.flood) * 100 : 0;
    const dist = center
      ? haversineMiles(center.lat, center.lng, g.lat, g.lng)
      : null;
    return (
      <PanelShell onClose={onClose} onSwitch={onSwitch} switchLabel={switchLabel}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ob-faint">
              Flood gauge
            </p>
            <h2 className="font-mono text-2xl text-ob-text">#{g.id}</h2>
          </div>
          <TierBadge tier={g.tier} />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-ob-muted">Water level vs flood stage</span>
            <span className="font-mono tabular text-ob-text">
              {fillPct.toFixed(0)}%
            </span>
          </div>
          <FillBar pct={fillPct} color={TIER_COLOR[g.tier]} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Metric label="Current" value={g.current.toFixed(1)} unit="ft" />
          <Metric label="Flood stage" value={g.flood.toFixed(1)} unit="ft" />
          <Metric label="Headroom" value={g.buffer.toFixed(1)} unit="ft" />
          {dist != null ? (
            <Metric label="From you" value={dist.toFixed(1)} unit="mi" />
          ) : (
            <Metric label="Tier" value={TIER_LABEL[g.tier]} />
          )}
        </div>

        <p className="mt-4 font-mono text-[11px] leading-relaxed text-ob-faint">
          {g.lat.toFixed(4)}, {g.lng.toFixed(4)}
        </p>
      </PanelShell>
    );
  }

  // ── Address node (or default summary) ─────────────────────────────────────
  const { risk, weather, drive, bayous } = snapshot;
  return (
    <PanelShell onClose={onClose} onSwitch={onSwitch} switchLabel={switchLabel}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ob-faint">
            Your location
          </p>
          <h2 className="truncate font-serif text-xl text-ob-text" title={risk.address}>
            {risk.address}
          </h2>
        </div>
        <TierBadge tier={risk.tier} />
      </div>

      <div className="mt-4 flex items-end gap-3">
        <span
          className="font-mono text-5xl leading-none tabular"
          style={{ color: TIER_COLOR[risk.tier] }}
        >
          {risk.score}
        </span>
        <span className="pb-1 text-sm text-ob-muted">/ 100 risk score</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ob-muted">{risk.message}</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Metric label="Temp" value={weather.tempF} unit="°F" />
        <Metric label="Conditions" value={weather.conditions} />
        <Metric label="Wind" value={weather.windMph} unit="mph" />
        <Metric label="Humidity" value={weather.humidity} unit="%" />
      </div>

      <div
        className="mt-3 rounded-xl border p-3"
        style={{ borderColor: DRIVE_COLOR[drive.state], backgroundColor: TIER_TINT[risk.tier] }}
      >
        <p className="text-[10px] uppercase tracking-[0.16em] text-ob-faint">Roads</p>
        <p className="mt-0.5 font-semibold" style={{ color: DRIVE_COLOR[drive.state] }}>
          {DRIVE_LABEL[drive.state]}
        </p>
        <p className="mt-0.5 text-xs text-ob-muted">{drive.message}</p>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ob-faint">
          Nearest gauges
        </p>
        <ul className="flex flex-col gap-2.5">
          {bayous.map((b) => {
            const pct = b.flood > 0 ? Math.min(100, (b.stage / b.flood) * 100) : 0;
            const color =
              pct >= 90 ? TIER_COLOR.CRITICAL : pct >= 70 ? TIER_COLOR.HIGH : pct >= 45 ? TIER_COLOR.MEDIUM : TIER_COLOR.LOW;
            return (
              <li key={b.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ob-text">{b.name}</span>
                  <span className="font-mono tabular text-ob-muted">
                    {b.stage.toFixed(1)} / {b.flood.toFixed(1)} ft
                  </span>
                </div>
                <FillBar pct={pct} color={color} />
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 text-[11px] leading-snug text-ob-faint">
        Live data from the Harris County Flood Warning System. Not a substitute for
        official alerts from Harris County or the National Weather Service.
      </p>
    </PanelShell>
  );
}

function PanelShell({
  children,
  onClose,
  onSwitch,
  switchLabel,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onSwitch: () => void;
  switchLabel: string;
}) {
  return (
    <div className="ob-panel reveal flex max-h-full flex-col rounded-2xl shadow-panel">
      <div className="thin-scroll overflow-y-auto p-5">{children}</div>
      <div className="flex items-center gap-2 border-t border-ob-border p-3">
        <button
          type="button"
          onClick={onSwitch}
          className="flex-1 rounded-xl bg-ob-accent/15 px-3 py-2 text-sm font-semibold text-ob-accent transition hover:bg-ob-accent/25"
        >
          {switchLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="rounded-xl border border-ob-border px-3 py-2 text-sm text-ob-muted transition hover:text-ob-text"
        >
          Close
        </button>
      </div>
    </div>
  );
}
