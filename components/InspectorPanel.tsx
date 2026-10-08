'use client';

/* Inspector for the watershed graph. Renders metrics for whatever node is
 * selected: the searched address (full risk + weather + drive + bayous) or a
 * single gauge (level vs flood stage, headroom, distance). */

import { useEffect, useState } from 'react';
import type { GraphSelection } from './WatershedGraph';
import type { HomeSnapshot, Tier, DriveVerdict, Outlook, RainForecast } from '@/lib/types';
import type { GaugeHistory } from '@/lib/history';
import { TIER_COLOR, TIER_TINT, TIER_LABEL } from '@/lib/theme';
import { classifyTrend } from '@/lib/hcfws';

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

// Outlook levels reuse the tier palette so the panel stays one color system.
const OUTLOOK_COLOR: Record<Outlook['level'], string> = {
  CLEAR: TIER_COLOR.LOW,
  WATCH: TIER_COLOR.MEDIUM,
  WARNING: TIER_COLOR.HIGH,
};
const OUTLOOK_TINT: Record<Outlook['level'], string> = {
  CLEAR: TIER_TINT.LOW,
  WATCH: TIER_TINT.MEDIUM,
  WARNING: TIER_TINT.HIGH,
};

// Live gauge trend -> arrow + color. Rising water is the danger direction.
function TrendArrow({ trend }: { trend: number }) {
  const state = classifyTrend(trend);
  if (state === 'steady') {
    return <span className="font-mono text-xs text-ob-faint">→ steady</span>;
  }
  const rising = state === 'rising';
  return (
    <span
      className="font-mono text-xs"
      style={{ color: rising ? TIER_COLOR.HIGH : TIER_COLOR.LOW }}
      title={`${rising ? 'Rising' : 'Falling'} ${Math.abs(trend).toFixed(2)} ft/hr`}
    >
      {rising ? '↑' : '↓'} {Math.abs(trend).toFixed(2)} ft/hr
    </span>
  );
}

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

/* 6-hour outlook banner: where the water is heading, not just where it is. */
function OutlookCard({ outlook }: { outlook: Outlook }) {
  const color = OUTLOOK_COLOR[outlook.level];
  return (
    <div
      className="mt-3 rounded-xl border p-3"
      style={{ borderColor: color, backgroundColor: OUTLOOK_TINT[outlook.level] }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.16em] text-ob-faint">
          Next 6 hours
        </p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: OUTLOOK_TINT[outlook.level], color }}
        >
          {outlook.level}
        </span>
      </div>
      <p className="mt-0.5 font-semibold" style={{ color }}>
        {outlook.headline}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-ob-muted">{outlook.detail}</p>
    </div>
  );
}

/* Hourly rain bars for the next 12h. Height scales to the wettest hour so a
 * drizzle day still reads; the wettest hour caps the scale. */
function RainBars({ rain }: { rain: RainForecast }) {
  const max = Math.max(0.1, ...rain.inches);
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-[11px] uppercase tracking-[0.18em] text-ob-faint">
          Rain · next 12h
        </span>
        <span className="font-mono tabular text-ob-muted">
          {rain.totalNext12h.toFixed(2)}&quot; total
        </span>
      </div>
      <div className="flex h-10 items-end gap-1">
        {rain.inches.map((v, i) => (
          <div
            key={rain.hours[i] ?? i}
            className="flex-1 rounded-t-sm bg-ob-accent/70 transition-all"
            style={{
              height: `${Math.max(4, (v / max) * 100)}%`,
              opacity: v > 0 ? 1 : 0.18,
            }}
            title={`${new Date(rain.hours[i]).getHours()}:00 — ${v.toFixed(2)}"`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ob-faint">
        <span>now</span>
        <span>+6h</span>
        <span>+12h</span>
      </div>
    </div>
  );
}

/* 48h water-level sparkline for a single gauge. Fetches on gauge select;
 * renders nothing until (and unless) history arrives — additive UI only. */
function HistorySparkline({ gaugeId, color }: { gaugeId: number; color: string }) {
  const [history, setHistory] = useState<GaugeHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHistory(null);
    fetch(`/api/gauge-history?id=${gaugeId}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: GaugeHistory | null) => setHistory(data))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [gaugeId]);

  if (loading) {
    return (
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ob-faint">
          Level · last 48h
        </p>
        <div className="mt-1.5 h-14 animate-pulse rounded-lg bg-ob-bg2/60" />
      </div>
    );
  }
  if (!history || history.points.length < 2) return null;

  const { points, floodLevel } = history;
  const levels = points.map((p) => p.level);
  let min = Math.min(...levels);
  let max = Math.max(...levels);
  // Include flood stage in scale only when it's near the data, so a gauge
  // sitting 30 ft below flood still shows visible movement.
  const floodInRange =
    floodLevel != null && floodLevel <= max + (max - min) * 0.75 + 0.5;
  if (floodInRange && floodLevel != null) max = Math.max(max, floodLevel);
  const span = Math.max(max - min, 0.5);
  min -= span * 0.08;
  max += span * 0.08;

  const W = 240;
  const H = 56;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.level).toFixed(1)}`)
    .join(' ');
  const area = `${path} L${W},${H} L0,${H} Z`;
  const last = points[points.length - 1];

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-[11px] uppercase tracking-[0.18em] text-ob-faint">
          Level · last 48h
        </span>
        <span className="font-mono tabular text-ob-muted">
          {last.level.toFixed(2)} ft now
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-14 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Water level over the last 48 hours, currently ${last.level.toFixed(1)} feet`}
      >
        <path d={area} fill={color} opacity={0.12} />
        {floodInRange && floodLevel != null && (
          <line
            x1={0}
            x2={W}
            y1={y(floodLevel)}
            y2={y(floodLevel)}
            stroke={TIER_COLOR.CRITICAL}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.7}
          />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
        <circle cx={x(points.length - 1)} cy={y(last.level)} r={2.5} fill={color} />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ob-faint">
        <span>-48h</span>
        {floodInRange && floodLevel != null && (
          <span style={{ color: TIER_COLOR.CRITICAL }}>
            flood {floodLevel.toFixed(1)} ft
          </span>
        )}
        <span>now</span>
      </div>
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
              Flood gauge{g.county ? ` · ${g.county} network` : ''}
            </p>
            <h2 className="font-mono text-2xl text-ob-text">#{g.id}</h2>
            {g.trend != null && (
              <div className="mt-1">
                <TrendArrow trend={g.trend} />
              </div>
            )}
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

        <HistorySparkline gaugeId={g.id} color={TIER_COLOR[g.tier]} />

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Metric label="Current" value={g.current.toFixed(1)} unit="ft" />
          <Metric label="Flood stage" value={g.flood.toFixed(1)} unit="ft" />
          <Metric label="Headroom" value={g.buffer.toFixed(1)} unit="ft" />
          {dist != null ? (
            <Metric label="From you" value={dist.toFixed(1)} unit="mi" />
          ) : (
            <Metric label="Tier" value={TIER_LABEL[g.tier]} />
          )}
          {g.rainfall != null && g.rainfall > 0 && (
            <Metric label="Rain at site" value={g.rainfall.toFixed(2)} unit="in" />
          )}
        </div>

        <p className="mt-4 font-mono text-[11px] leading-relaxed text-ob-faint">
          {g.lat.toFixed(4)}, {g.lng.toFixed(4)}
          {g.readAt ? ` · read ${new Date(g.readAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
        </p>
      </PanelShell>
    );
  }

  // ── Address node (or default summary) ─────────────────────────────────────
  const { risk, weather, drive, bayous, rain, outlook } = snapshot;
  return (
    <PanelShell onClose={onClose} onSwitch={onSwitch} switchLabel={switchLabel}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ob-faint">
            Your location
          </p>
          <h2 className="truncate text-xl font-semibold tracking-tight text-ob-text" title={risk.address}>
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

      {outlook && <OutlookCard outlook={outlook} />}

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

      {rain && <RainBars rain={rain} />}

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
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-ob-text">{b.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {b.trend != null && <TrendArrow trend={b.trend} />}
                    <span className="font-mono tabular text-ob-muted">
                      {b.stage.toFixed(1)} / {b.flood.toFixed(1)} ft
                    </span>
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
