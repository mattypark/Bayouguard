'use client';

/* Addicks and Barker — TX-07's signature risk. Both reservoirs drove the
 * worst Memorial-area flooding during Harvey. Pool elevation and trend are
 * real (HCFWS dam gauges) until /reservoirs adds capacity and outflow. */

import { useId, useState } from 'react';
import type { Reservoir } from '@/lib/contract';
import { useI18n } from '@/lib/i18n';
import { useEndpoint } from '@/lib/useEndpoint';
import { TIER_INK } from '@/lib/theme';
import Skeleton from '../Skeleton';

// Record pools during Harvey (USACE, Aug 2017), feet.
const HARVEY_PEAK: Record<string, number> = { Addicks: 109.1, Barker: 101.6 };
export const RESERVOIR_POINTS = [
  { name: 'Addicks', lat: 29.7907, lng: -95.625 },
  { name: 'Barker', lat: 29.7707, lng: -95.6466 },
];

function Row({ r }: { r: Reservoir }) {
  const { t, num } = useI18n();
  const peak = HARVEY_PEAK[r.name];
  const trendColor = r.trend === 'rising' ? TIER_INK.HIGH : r.trend === 'falling' ? TIER_INK.LOW : undefined;
  return (
    <li className="rounded-lg border border-ob-border bg-ob-surface2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.875rem] font-semibold text-ob-text">{t('res.name', { name: r.name })}</p>
        <p className="text-[0.75rem] font-medium" style={{ color: trendColor }}>
          {t(`res.trend.${r.trend}`)}
        </p>
      </div>
      <p className="mt-1 text-[0.8125rem] text-ob-muted">
        {t('res.pool')}: <span className="font-mono tabular text-ob-text">{num(r.poolElevationFt, 1)} ft</span>
        {peak ? <> · {t('res.harvey', { ft: num(peak, 1) })}</> : null}
      </p>
      {r.percentCapacity != null ? (
        <div className="mt-2">
          <div className="flex justify-between text-[0.75rem] text-ob-muted">
            <span>{t('res.capacity')}</span>
            <span className="font-mono tabular text-ob-text">{Math.round(r.percentCapacity)}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-ob-bg2">
            <div className="h-full rounded-full bg-ob-water" style={{ width: `${Math.min(100, Math.max(0, r.percentCapacity))}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-1 text-[0.75rem] text-ob-muted">{t('res.capacityUnknown')}</p>
      )}
      <p className="mt-1 text-[0.75rem] text-ob-muted">
        {t('res.outflow')}:{' '}
        {r.outflowCfs != null ? (
          <span className="font-mono tabular text-ob-text">{r.outflowCfs.toLocaleString()} cfs</span>
        ) : (
          t('res.unknown')
        )}
      </p>
    </li>
  );
}

export default function ReservoirCard({ collapsible = false }: { collapsible?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(!collapsible);
  const titleId = useId();
  const { data, source, loading, error, retry } = useEndpoint<Reservoir[]>(open ? '/api/reservoirs' : null);

  const body = loading ? (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  ) : error || !data ? (
    <p className="text-[0.8125rem] text-ob-muted">
      {t('res.error')}{' '}
      <button type="button" onClick={retry} className="font-semibold text-ob-accent hover:underline">
        {t('action.retry')}
      </button>
    </p>
  ) : (
    <>
      <ul className="flex flex-col gap-2">
        {data.map((r) => (
          <Row key={r.name} r={r} />
        ))}
      </ul>
      <p className="mt-2 text-[0.75rem] leading-snug text-ob-muted">
        {source === 'live' ? t('res.sourceLive') : source === 'partial' ? t('res.sourcePartial') : t('res.sourceDemo')}
      </p>
    </>
  );

  return (
    <section aria-labelledby={titleId}>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-2 text-left hover:bg-ob-bg"
        >
          <span id={titleId} className="text-[0.75rem] font-medium text-ob-muted">
            {t('res.title')}
          </span>
          <span aria-hidden className={`text-ob-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
      ) : (
        <p id={titleId} className="text-[0.75rem] font-medium text-ob-muted">
          {t('res.title')}
        </p>
      )}
      {open && (
        <div className={collapsible ? 'px-2 pb-2' : 'mt-2'}>
          <p className="mb-2 text-[0.8125rem] leading-snug text-ob-text">{t('res.context')}</p>
          {body}
        </div>
      )}
    </section>
  );
}
