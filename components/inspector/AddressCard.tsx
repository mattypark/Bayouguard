'use client';

/* The address summary, ordered by urgency: can I drive, how risky is it,
 * where is it heading, then the detail behind it. */

import dynamic from 'next/dynamic';
import type { DataSource, HomeSnapshot } from '@/lib/types';
import type { Forecast } from '@/lib/contract';
import { useI18n } from '@/lib/i18n';
import { useEndpoint } from '@/lib/useEndpoint';
import { haversine } from '@/lib/geo';
import { weatherLabel } from '@/lib/describe';
import DriveCard from './DriveCard';
import RiskArc from './RiskArc';
import FloodMemory from './FloodMemory';
import ReservoirCard, { RESERVOIR_POINTS } from './ReservoirCard';
import ActionRow from './ActionRow';
import { FillBar, Metric, OutlookCard, RainBars, TrendArrow } from './parts';
import Skeleton from '../Skeleton';
import { TIER_COLOR } from '@/lib/theme';
import { tierForScore } from './tierForScore';

const ForecastChart = dynamic(() => import('./ForecastChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-28 w-full" />,
});

const RESERVOIR_RADIUS_MI = 10;

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-[0.75rem] font-medium text-ob-muted">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function AddressCard({
  snapshot,
  center,
  dataSource,
  detailsOnly = false,
}: {
  snapshot: HomeSnapshot;
  center: { lat: number; lng: number } | null;
  dataSource: DataSource;
  /** Just the supporting detail (the result page shows the answer itself). */
  detailsOnly?: boolean;
}) {
  const { t, num } = useI18n();
  const { risk, weather, drive, bayous, rain, outlook } = snapshot;

  const forecastUrl = center
    ? `/api/forecast?lat=${center.lat}&lng=${center.lng}&score=${risk.score}&level=${outlook?.level ?? 'CLEAR'}`
    : null;
  const forecast = useEndpoint<Forecast>(forecastUrl);

  const nearReservoirs =
    center != null &&
    RESERVOIR_POINTS.some((p) => haversine(center.lat, center.lng, p.lat, p.lng) <= RESERVOIR_RADIUS_MI);

  return (
    <div>
      {!detailsOnly && (
        <>
          <p className="text-[0.75rem] font-medium text-ob-muted">{t('insp.yourLocation')}</p>
          <h2 className="mb-3 text-[1.125rem] font-semibold leading-snug text-ob-text">{risk.address}</h2>
          <DriveCard drive={drive} />
          <div className="mt-5">
            <RiskArc risk={risk} />
          </div>
        </>
      )}

      {outlook && (
        <Section title={t('outlook.title')}>
          <OutlookCard outlook={outlook} />
          <div className="mt-3">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-[0.75rem] font-medium text-ob-muted">{t('forecast.title')}</p>
              {forecast.source === 'demo' && (
                <span className="rounded-full border border-ob-border px-2 py-0.5 text-[0.75rem] font-medium text-ob-muted">
                  {t('label.demo')}
                </span>
              )}
            </div>
            {forecast.loading ? (
              <Skeleton className="h-28 w-full" />
            ) : forecast.data ? (
              <ForecastChart forecast={forecast.data} />
            ) : (
              <p className="text-[0.8125rem] text-ob-muted">
                {t('forecast.error')}{' '}
                <button type="button" onClick={forecast.retry} className="font-semibold text-ob-accent hover:underline">
                  {t('action.retry')}
                </button>
              </p>
            )}
          </div>
        </Section>
      )}

      {rain && (
        <div className="mt-5">
          <RainBars rain={rain} />
        </div>
      )}

      {bayous.length > 0 && (
        <Section title={t('insp.nearest')}>
          <ul className="flex flex-col gap-3">
            {bayous.map((b) => {
              const pct = b.flood > 0 ? Math.min(100, (b.stage / b.flood) * 100) : 0;
              const tier = tierForScore(pct >= 100 ? 95 : pct >= 90 ? 80 : pct >= 75 ? 55 : 20);
              return (
                <li key={b.id}>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="min-w-0 text-[0.8125rem] leading-snug text-ob-text">
                      {b.name}
                      <span className="block text-[0.75rem] text-ob-muted">
                        {num(b.miles, 1)} {t('common.mi')}
                        {b.trend != null && (
                          <>
                            {' · '}
                            <TrendArrow trend={b.trend} />
                          </>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[0.75rem] tabular text-ob-muted">
                      {num(b.stage, 1)} / {num(b.flood, 1)} {t('common.ft')}
                    </span>
                  </div>
                  <FillBar pct={pct} color={TIER_COLOR[tier]} />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <div className="mt-5">
        <FloodMemory zip={risk.zip} />
      </div>

      {nearReservoirs && (
        <div className="mt-5">
          <ReservoirCard />
        </div>
      )}

      {weather && (
        <Section title={t('insp.weather')}>
          <div className="grid grid-cols-2 gap-2">
            <Metric label={t('insp.temp')} value={weather.tempF} unit="°F" />
            <Metric label={t('insp.conditions')} value={weatherLabel(weather.code, t)} />
            <Metric label={t('insp.wind')} value={weather.windMph} unit={t('common.mph')} />
            <Metric label={t('insp.humidity')} value={weather.humidity} unit="%" />
          </div>
        </Section>
      )}

      {!detailsOnly && (
        <>
          <div className="mt-5">
            <ActionRow snapshot={snapshot} center={center} />
          </div>
          <p className="mt-3 text-[0.75rem] leading-snug text-ob-muted">
            {t(`footer.${dataSource}`)} {t('footer.disclaimer')}
          </p>
        </>
      )}
    </div>
  );
}
