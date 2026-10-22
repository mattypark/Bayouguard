'use client';

/* Building blocks shared by the inspector's address and gauge views. */

import { useEffect, useState } from 'react';
import type { DriveVerdict, Outlook, RainForecast, Tier } from '@/lib/types';
import type { GaugeHistory } from '@/lib/history';
import { TIER_COLOR, TIER_INK, TIER_TINT } from '@/lib/theme';
import { classifyTrend } from '@/lib/trend';
import { useI18n } from '@/lib/i18n';
import { outlookDetail } from '@/lib/describe';

export const DRIVE_COLOR: Record<DriveVerdict['state'], string> = {
  YES: TIER_INK.LOW,
  CAUTION: TIER_INK.MEDIUM,
  NO: TIER_INK.HIGH,
};

// Outlook levels reuse the tier palette so the panel stays one color system.
export const OUTLOOK_COLOR: Record<Outlook['level'], string> = {
  CLEAR: TIER_INK.LOW,
  WATCH: TIER_INK.MEDIUM,
  WARNING: TIER_INK.HIGH,
};
export const OUTLOOK_TINT: Record<Outlook['level'], string> = {
  CLEAR: TIER_TINT.LOW,
  WATCH: TIER_TINT.MEDIUM,
  WARNING: TIER_TINT.HIGH,
};

// Live gauge trend -> arrow + color. Rising water is the danger direction.
export function TrendArrow({ trend }: { trend: number }) {
  const { t, num } = useI18n();
  const state = classifyTrend(trend);
  if (state === 'steady') {
    return <span className="text-xs text-ob-muted">→ {t('trend.steady')}</span>;
  }
  const rising = state === 'rising';
  const label = t(rising ? 'trend.rising' : 'trend.falling', { rate: num(Math.abs(trend), 2) });
  return (
    <span className="text-xs font-medium" style={{ color: rising ? TIER_INK.HIGH : TIER_INK.LOW }}>
      <span aria-hidden>{rising ? '↑' : '↓'}</span> {label}
    </span>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  const { t } = useI18n();
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold"
      style={{ backgroundColor: TIER_TINT[tier], color: TIER_INK[tier] }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: TIER_COLOR[tier] }}
      />
      {t(`tier.${tier}`)}
    </span>
  );
}

export function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  // Numbers set in mono; words (weather) in the UI face, which has Vietnamese.
  const numeric = typeof value === 'number' || /^[\d.,\s-]+$/.test(value);
  return (
    <div className="rounded-lg border border-ob-border bg-ob-surface2 p-3">
      <p className="text-[0.75rem] text-ob-muted font-medium">{label}</p>
      <p className={`mt-1 tabular text-ob-text ${numeric ? 'font-mono text-xl' : 'text-base font-medium'}`}>
        {value}
        {unit && <span className="ml-1 text-xs text-ob-muted">{unit}</span>}
      </p>
    </div>
  );
}

/* 6-hour outlook banner: where the water is heading, not just where it is. */
export function OutlookCard({ outlook }: { outlook: Outlook }) {
  const { t, num } = useI18n();
  const color = OUTLOOK_COLOR[outlook.level];
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: color, backgroundColor: OUTLOOK_TINT[outlook.level] }}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-snug" style={{ color }}>
          {t(`outlook.${outlook.kind}`)}
        </p>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[0.75rem] font-semibold" style={{ borderColor: color, color }}>
          {t(`outlook.level.${outlook.level}`)}
        </span>
      </div>
      <p className="mt-1 text-[0.8125rem] leading-relaxed text-ob-text">{outlookDetail(outlook, t, num)}</p>
      <p className="mt-1.5 text-[0.75rem] text-ob-text">{t('outlook.note')}</p>
    </div>
  );
}

/* Hourly rain bars for the next 12h. Height scales to the wettest hour so a
 * drizzle day still reads; the wettest hour caps the scale. */
export function RainBars({ rain }: { rain: RainForecast }) {
  const { t, num } = useI18n();
  const max = Math.max(0.1, ...rain.inches);
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-[0.75rem] text-ob-muted font-medium">{t('insp.rain12')}</span>
        <span className="font-mono tabular text-ob-muted">
          {t('insp.rainTotal', { inches: num(rain.totalNext12h, 2) })}
        </span>
      </div>
      <div className="flex h-10 items-end gap-1">
        {rain.inches.map((v, i) => (
          <div
            key={rain.hours[i] ?? i}
            className="flex-1 rounded-t-sm bg-ob-water"
            style={{
              height: `${Math.max(4, (v / max) * 100)}%`,
              opacity: v > 0 ? 1 : 0.18,
            }}
            title={`${new Date(rain.hours[i]).getHours()}:00 — ${v.toFixed(2)}"`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[0.75rem] text-ob-muted">
        <span>{t('common.now')}</span>
        <span>+6h</span>
        <span>+12h</span>
      </div>
    </div>
  );
}

/* 48h water-level sparkline for a single gauge. Fetches on gauge select;
 * renders nothing until (and unless) history arrives — additive UI only. */
export function HistorySparkline({ gaugeId, color }: { gaugeId: number; color: string }) {
  const { t, num } = useI18n();
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
        <p className="text-[0.75rem] text-ob-muted font-medium">{t('insp.history')}</p>
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
        <span className="text-[0.75rem] text-ob-muted font-medium">{t('insp.history')}</span>
        <span className="font-mono tabular text-ob-muted">
          {t('insp.historyNow', { ft: num(last.level, 2) })}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-14 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={t('insp.historyAria', { ft: num(last.level, 1) })}
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
      <div className="mt-1 flex justify-between font-mono text-[0.75rem] text-ob-muted">
        <span>-48h</span>
        {floodInRange && floodLevel != null && (
          <span style={{ color: TIER_INK.CRITICAL }}>
            {t('insp.floodLine', { ft: num(floodLevel, 1) })}
          </span>
        )}
        <span>{t('common.now')}</span>
      </div>
    </div>
  );
}

export function FillBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ob-bg2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
