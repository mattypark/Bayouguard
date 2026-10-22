'use client';

/* Inspector for whatever is selected: the searched address (AddressCard) or
 * a single gauge (level vs flood stage, its last 48 hours, headroom, and how
 * far it is from the searched address). On phones the parent puts this in a
 * bottom sheet; on wider screens it's the right-hand column. */

import type { GraphSelection } from './WatershedGraph';
import type { DataSource, HomeSnapshot } from '@/lib/types';
import { TIER_COLOR } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { haversine } from '@/lib/geo';
import AddressCard from './inspector/AddressCard';
import { FillBar, HistorySparkline, Metric, TierBadge, TrendArrow } from './inspector/parts';

interface Props {
  selection: GraphSelection | null;
  snapshot: HomeSnapshot | null;
  dataSource: DataSource;
  center: { lat: number; lng: number } | null;
  address: string | null;
  switchLabel: string;
  onSwitch: () => void;
  onClose: () => void;
  /** In a bottom sheet the sheet supplies the card and drag handle. */
  bare?: boolean;
}

export default function InspectorPanel({
  selection,
  snapshot,
  dataSource,
  center,
  address,
  switchLabel,
  onSwitch,
  onClose,
  bare = false,
}: Props) {
  const { t, num, time } = useI18n();
  let body: React.ReactNode = null;

  if (selection?.kind === 'gauge' && selection.gauge) {
    const g = selection.gauge;
    const fillPct = g.flood > 0 ? (g.current / g.flood) * 100 : 0;
    const dist = center ? haversine(center.lat, center.lng, g.lat, g.lng) : null;
    body = (
      <>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.75rem] font-medium text-ob-muted">
              {t('insp.floodGauge')}
              {g.county ? ` · ${t('insp.network', { county: g.county })}` : ''}
            </p>
            <h2 className="text-lg font-semibold leading-snug text-ob-text">{g.name}</h2>
            {g.trend != null && (
              <div className="mt-1">
                <TrendArrow trend={g.trend} />
              </div>
            )}
          </div>
          <TierBadge tier={g.tier} />
        </div>

        {dist != null && address && (
          <p className="mt-2 text-[0.8125rem] text-ob-muted">
            {t('insp.nearestTo', { miles: num(dist, 1), address })}
          </p>
        )}

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-ob-muted">{t('insp.levelVsFlood')}</span>
            <span className="font-mono tabular text-ob-text">{Math.round(fillPct)}%</span>
          </div>
          <FillBar pct={fillPct} color={TIER_COLOR[g.tier]} />
        </div>

        <HistorySparkline gaugeId={g.id} color="rgb(var(--ob-water-rgb))" />

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Metric label={t('insp.current')} value={num(g.current, 1)} unit={t('common.ft')} />
          <Metric label={t('insp.floodStage')} value={num(g.flood, 1)} unit={t('common.ft')} />
          <Metric label={t('insp.headroom')} value={num(g.buffer, 1)} unit={t('common.ft')} />
          {dist != null ? (
            <Metric label={t('insp.fromYou')} value={num(dist, 1)} unit={t('common.mi')} />
          ) : (
            <Metric label={t('insp.tier')} value={t(`tier.${g.tier}`)} />
          )}
          {g.rainfall != null && g.rainfall > 0 && (
            <Metric label={t('insp.rainAtSite')} value={num(g.rainfall, 2)} unit="in" />
          )}
        </div>

        <p className="mt-4 text-[0.75rem] leading-relaxed text-ob-muted">
          <span className="font-mono">
            {g.lat.toFixed(4)}, {g.lng.toFixed(4)}
          </span>
          {g.readAt ? ` · ${t('insp.readAt', { time: time(g.readAt) })}` : ''}
        </p>
        <p className="mt-2 text-[0.75rem] leading-snug text-ob-muted">
          {t(`footer.${dataSource}`)} {t('footer.disclaimer')}
        </p>
      </>
    );
  } else if (snapshot) {
    body = <AddressCard snapshot={snapshot} center={center} dataSource={dataSource} />;
  } else {
    return null;
  }

  const footer = (
    <div className="flex items-center gap-2 border-t border-ob-border p-3">
      <button
        type="button"
        onClick={onSwitch}
        className="h-11 flex-1 rounded-lg border border-ob-border bg-ob-surface px-3 text-sm font-semibold text-ob-accent transition-colors hover:bg-ob-bg"
      >
        {switchLabel}
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('insp.close')}
        className="h-11 rounded-lg border border-ob-border px-4 text-sm text-ob-muted transition-colors hover:text-ob-text"
      >
        {t('common.close')}
      </button>
    </div>
  );

  if (bare) {
    return (
      <div className="flex min-h-full flex-col">
        <div className="flex-1 px-5 pb-4 pt-1">{body}</div>
        {footer}
      </div>
    );
  }

  return (
    <div className="ob-panel ob-float reveal flex max-h-full flex-col rounded-xl">
      <div className="thin-scroll overflow-y-auto p-5">{body}</div>
      {footer}
    </div>
  );
}
