'use client';

/* Emergency shelters, nearest first. Sample statuses until the backend's
 * /shelters ships — and every card says so, because a real shelter must
 * never look open when nobody has said it is. */

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import PageShell from '../PageShell';
import Skeleton from '../Skeleton';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { useEndpoint } from '@/lib/useEndpoint';
import { readLastSearch, readSaved, type SavedAddress } from '@/lib/savedAddress';
import { haversine } from '@/lib/geo';
import type { Shelter } from '@/lib/contract';
import { TIER_INK, TIER_TINT } from '@/lib/theme';

const ShelterMap = dynamic(() => import('../ShelterMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

type Filter = 'open' | 'pets' | 'accessible';
const FILTERS: Array<{ key: Filter; label: MsgKey }> = [
  { key: 'open', label: 'shelters.filter.open' },
  { key: 'pets', label: 'shelters.filter.pets' },
  { key: 'accessible', label: 'shelters.filter.accessible' },
];

const STATUS_TONE: Record<Shelter['status'], 'LOW' | 'MEDIUM' | 'HIGH'> = { open: 'LOW', full: 'MEDIUM', closed: 'HIGH' };

function Badge({ status }: { status: Shelter['status'] }) {
  const { t } = useI18n();
  const tone = STATUS_TONE[status];
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.75rem] font-semibold"
      style={{ color: TIER_INK[tone], background: TIER_TINT[tone] }}
    >
      {t(`shelter.status.${status}`)}
    </span>
  );
}

function PawIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <ellipse cx="7" cy="8" rx="2" ry="2.6" />
      <ellipse cx="12" cy="6" rx="2" ry="2.6" />
      <ellipse cx="17" cy="8" rx="2" ry="2.6" />
      <path d="M12 11c-3 0-6 4-6 6.5 0 1.6 1.3 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3-.9 3-2.5C18 15 15 11 12 11z" />
    </svg>
  );
}

function AccessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="4.5" r="1.8" fill="currentColor" />
      <path d="M12 7.5v6h5l2 5M12 10.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11.5a5 5 0 1 0 6.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function SheltersView() {
  const { t, num, time, locale } = useI18n();
  const { data, source, loading, error, retry } = useEndpoint<Shelter[]>('/api/shelters');
  const [filters, setFilters] = useState<ReadonlySet<Filter>>(new Set());
  const [view, setView] = useState<'list' | 'map'>('list');
  const [origin, setOrigin] = useState<SavedAddress | null>(null);

  useEffect(() => {
    const saved = readSaved();
    setOrigin(saved?.lat != null ? saved : readLastSearch());
  }, []);

  const toggle = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const shown = useMemo(() => {
    const list = (data ?? []).filter(
      (s) =>
        (!filters.has('open') || s.status === 'open') &&
        (!filters.has('pets') || s.petFriendly) &&
        (!filters.has('accessible') || s.accessible),
    );
    const withDist = list.map((s) => ({
      s,
      miles: origin?.lat != null && origin.lng != null ? haversine(origin.lat, origin.lng, s.lat, s.lng) : null,
    }));
    return withDist.sort((a, b) =>
      a.miles != null && b.miles != null ? a.miles - b.miles : a.s.name.localeCompare(b.s.name, locale),
    );
  }, [data, filters, origin, locale]);

  const anyActive = (data ?? []).some((s) => s.status !== 'closed');
  const updated = (data ?? []).reduce<string | null>((m, s) => (!m || s.updatedAt > m ? s.updatedAt : m), null);
  const demo = source === 'demo';

  return (
    <PageShell>
      <h1 className="text-[1.625rem] font-semibold tracking-[-0.01em] text-ob-text">{t('shelters.title')}</h1>
      <p className="mt-1 text-[0.9375rem] text-ob-muted">
        {origin ? t('shelters.sortedFrom', { address: origin.label }) : t('shelters.sortedHint')}
      </p>

      {demo && (
        <p className="mt-4 rounded-lg border-l-4 px-3 py-2 text-[0.875rem] text-ob-text" style={{ borderColor: 'var(--tier-med-ink)', background: 'var(--tier-med-tint)' }}>
          {t('shelters.demo')}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={filters.size === 0}
          onClick={() => setFilters(new Set())}
          className={`h-11 rounded-full border px-4 text-[0.875rem] font-semibold transition-colors ${
            filters.size === 0 ? 'border-ob-accent bg-ob-accent text-ob-onaccent' : 'border-ob-border bg-ob-surface text-ob-accent hover:bg-ob-bg'
          }`}
        >
          {t('shelters.filter.all')}
        </button>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filters.has(f.key)}
            onClick={() => toggle(f.key)}
            className={`h-11 rounded-full border px-4 text-[0.875rem] font-semibold transition-colors ${
              filters.has(f.key) ? 'border-ob-accent bg-ob-accent text-ob-onaccent' : 'border-ob-border bg-ob-surface text-ob-accent hover:bg-ob-bg'
            }`}
          >
            {t(f.label)}
          </button>
        ))}
        <div role="group" aria-label={t('shelters.viewAs')} className="ml-auto flex rounded-full border border-ob-border bg-ob-surface p-1">
          {(['list', 'map'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`h-9 rounded-full px-3 text-[0.8125rem] font-semibold ${view === v ? 'bg-ob-accent text-ob-onaccent' : 'text-ob-muted hover:text-ob-text'}`}
            >
              {t(v === 'list' ? 'shelters.list' : 'shelters.map')}
            </button>
          ))}
        </div>
      </div>

      {updated && (
        <p className="mt-3 text-[0.8125rem] text-ob-muted">{t('shelters.updated', { time: time(updated) })}</p>
      )}

      {loading ? (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-6 text-[0.9375rem] text-ob-text">
          {t('shelters.error')}{' '}
          <button type="button" onClick={retry} className="font-semibold text-ob-accent hover:underline">
            {t('action.retry')}
          </button>
        </p>
      ) : !anyActive ? (
        <section className="mt-6 rounded-xl border border-ob-border bg-ob-surface p-5">
          <p className="text-[1rem] font-semibold text-ob-text">{t('shelters.none.title')}</p>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ob-muted">
            {t('shelters.none.body')}{' '}
            <a href="https://www.readyharris.org" target="_blank" rel="noreferrer" className="font-semibold text-ob-accent underline">
              readyharris.org
            </a>
          </p>
        </section>
      ) : (
        <>
          {view === 'map' && (
            <div className="mt-4 h-[50vh] overflow-hidden rounded-xl border border-ob-border">
              <ShelterMap shelters={shown.map((x) => x.s)} />
            </div>
          )}
          {shown.length === 0 ? (
            <p className="mt-6 text-[0.9375rem] text-ob-muted">{t('shelters.noMatch')}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {shown.map(({ s, miles }) => {
                const pct = s.capacity ? Math.min(100, Math.round(((s.occupancy ?? 0) / s.capacity) * 100)) : null;
                return (
                  <li key={s.id} className="rounded-xl border border-ob-border bg-ob-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[1rem] font-semibold leading-snug text-ob-text">{s.name}</h2>
                        <p className="mt-0.5 text-[0.875rem] text-ob-muted">{s.address}</p>
                        {miles != null && (
                          <p className="mt-0.5 text-[0.875rem] text-ob-text">{t('shelters.distance', { miles: num(miles, 1) })}</p>
                        )}
                      </div>
                      <Badge status={s.status} />
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.875rem] text-ob-text">
                      <li className={`flex items-center gap-1.5 ${s.petFriendly ? '' : 'text-ob-muted'}`}>
                        <PawIcon />
                        {t(s.petFriendly ? 'shelters.pets' : 'shelters.noPets')}
                      </li>
                      <li className={`flex items-center gap-1.5 ${s.accessible ? '' : 'text-ob-muted'}`}>
                        <AccessIcon />
                        {t(s.accessible ? 'shelters.accessible' : 'shelters.notAccessible')}
                      </li>
                    </ul>
                    {pct != null && s.capacity && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[0.8125rem] text-ob-muted">
                          <span>{t('shelters.capacity')}</span>
                          <span className="font-mono tabular text-ob-text">
                            {(s.occupancy ?? 0).toLocaleString(locale)} / {s.capacity.toLocaleString(locale)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-ob-bg2" role="img" aria-label={t('shelters.capacityAria', { pct })}>
                          <div className="h-full rounded-full bg-ob-accent" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {demo && <span className="text-[0.75rem] font-medium text-ob-muted">{t('shelters.sample')}</span>}
                      <a
                        href={`https://maps.google.com/maps?daddr=${encodeURIComponent(s.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto flex h-11 items-center rounded-lg bg-ob-accent px-4 text-[0.875rem] font-semibold text-ob-onaccent hover:brightness-110"
                      >
                        {t('shelters.directions')}
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </PageShell>
  );
}
