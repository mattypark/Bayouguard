'use client';

/* The answer, in the order people need it: can I drive, how risky is it
 * here, what's coming, what should I do — then three big next steps. The
 * charts and sensor readings are folded under "More details" for anyone who
 * wants them. */

import Link from 'next/link';
import { useEffect } from 'react';
import PageShell from '../PageShell';
import Skeleton from '../Skeleton';
import DriveCard from '../inspector/DriveCard';
import RiskArc from '../inspector/RiskArc';
import AddressCard from '../inspector/AddressCard';
import ActionRow from '../inspector/ActionRow';
import { useFloodData } from '@/lib/useFloodData';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { writeLastSearch } from '@/lib/savedAddress';
import { rainBucket } from '@/lib/outlook';
import type { FloodView, Tier } from '@/lib/types';
import { TIER_INK } from '@/lib/theme';

const TODO: Record<Tier, MsgKey[]> = {
  LOW: ['todo.LOW.1', 'todo.LOW.2'],
  MEDIUM: ['todo.MEDIUM.1', 'todo.MEDIUM.2', 'todo.MEDIUM.3'],
  HIGH: ['todo.HIGH.1', 'todo.HIGH.2', 'todo.HIGH.3'],
  CRITICAL: ['todo.CRITICAL.1', 'todo.CRITICAL.2', 'todo.CRITICAL.3'],
};

function Arrow() {
  return <span aria-hidden className="ml-auto text-[1.25rem] leading-none">→</span>;
}

export default function CheckView({
  initial,
  address,
  coords,
}: {
  initial: FloodView;
  address: string;
  coords?: { lat: number; lng: number };
}) {
  const { t, num } = useI18n();
  const { view, loading, wake, notice, search } = useFloodData(initial, address, coords, true);
  const snap = view.snapshot;

  useEffect(() => {
    if (view.center && view.address && !view.outOfArea && !view.pending) {
      writeLastSearch({ label: view.address, ...view.center });
    }
  }, [view]);

  const big =
    'flex min-h-[56px] w-full items-center gap-3 rounded-xl px-5 text-left text-[1.125rem] font-semibold transition hover:brightness-110 active:scale-[0.99]';
  const mapHref = `/map?${new URLSearchParams({
    address: view.address ?? address,
    ...(view.center ? { lat: String(view.center.lat), lng: String(view.center.lng) } : {}),
  }).toString()}`;

  let body: React.ReactNode;
  if (!snap && (view.pending || loading)) {
    body = (
      <div aria-busy className="mt-6 flex flex-col gap-4">
        <p role="status" className="flex items-center gap-3 text-[1.125rem] text-ob-text">
          <span aria-hidden className="spin h-5 w-5 shrink-0 rounded-full border-[3px] border-ob-accent border-t-transparent" />
          {wake === 'waking' ? t('wake.message') : t('check.loading')}
        </p>
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  } else if (!snap) {
    const titleKey: MsgKey = notice === 'outOfArea' ? 'check.outOfAreaTitle' : notice === 'notFound' ? 'check.notFoundTitle' : 'error.unreachable';
    body = (
      <section className="mt-6 rounded-xl border border-ob-border bg-ob-surface p-5">
        <h2 className="text-[1.375rem] font-semibold text-ob-text">{t(titleKey)}</h2>
        <p className="mt-2 text-[1.0625rem] leading-relaxed text-ob-text">
          {notice === 'outOfArea' ? t('error.outOfArea') : notice === 'notFound' ? t('error.notFound') : t('wake.failed')}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {notice !== 'outOfArea' && notice !== 'notFound' && (
            <button type="button" onClick={() => void search(address, coords)} className={`${big} bg-ob-accent text-ob-onaccent`}>
              {t('action.retry')}
            </button>
          )}
          <Link href="/" className={`${big} border-2 border-ob-border bg-ob-surface text-ob-accent`}>
            {t('check.tryAgain')}
            <Arrow />
          </Link>
        </div>
      </section>
    );
  } else {
    const tier = snap.risk.tier;
    const o = snap.outlook;
    body = (
      <div className="mt-5 flex flex-col gap-6">
        {wake === 'waking' && (
          <p role="status" className="rounded-lg border border-ob-border bg-ob-surface px-4 py-3 text-[1rem] text-ob-text">
            {t('wake.message')}
          </p>
        )}

        {tier === 'CRITICAL' && (
          <a href="tel:911" className={`${big} justify-center text-white`} style={{ background: 'var(--tier-high-ink)' }}>
            {t('check.call911')}
          </a>
        )}

        <DriveCard drive={snap.drive} large />

        <section className="rounded-xl border border-ob-border bg-ob-surface p-5">
          <h2 className="mb-3 text-[1rem] font-medium text-ob-muted">{t('check.risk')}</h2>
          <RiskArc risk={snap.risk} large />
        </section>

        {o && (
          <section className="rounded-xl border border-ob-border bg-ob-surface p-5">
            <h2 className="text-[1rem] font-medium text-ob-muted">{t('check.next')}</h2>
            <p className="mt-1 text-[1.25rem] font-semibold leading-snug" style={{ color: TIER_INK[o.level === 'WARNING' ? 'HIGH' : o.level === 'WATCH' ? 'MEDIUM' : 'LOW'] }}>
              {t(`outlook.${o.kind}`)}
            </p>
            <p className="mt-1 text-[1.0625rem] leading-relaxed text-ob-text">
              {t(`outlook.rain.${rainBucket(o.rain6)}`, { inches: num(o.rain6, 2) })}
            </p>
          </section>
        )}

        <section>
          <h2 className="text-[1.375rem] font-semibold text-ob-text">{t('check.todo')}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {TODO[tier].map((k) => (
              <li key={k} className="flex gap-3 text-[1.125rem] leading-snug text-ob-text">
                <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TIER_INK[tier] }} />
                {t(k)}
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label={t('check.next.steps')} className="flex flex-col gap-3">
          <Link
            href={`/alerts?${new URLSearchParams({ address: snap.risk.address, ...(view.center ? { lat: String(view.center.lat), lng: String(view.center.lng) } : {}) }).toString()}`}
            className={`${big} bg-ob-accent text-ob-onaccent`}
          >
            {t('check.alerts')}
            <Arrow />
          </Link>
          <Link href={mapHref} className={`${big} border-2 border-ob-border bg-ob-surface text-ob-accent`}>
            {t('check.map')}
            <Arrow />
          </Link>
          <Link href="/shelters" className={`${big} border-2 border-ob-border bg-ob-surface text-ob-accent`}>
            {t('check.shelter')}
            <Arrow />
          </Link>
        </nav>

        <ActionRow snapshot={snap} center={view.center} showAlerts={false} />

        <details className="group rounded-xl border border-ob-border bg-ob-surface">
          <summary className="flex min-h-[60px] cursor-pointer list-none items-center gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="block text-[1.125rem] font-semibold text-ob-text">{t('check.details')}</span>
              <span className="block text-[0.9375rem] text-ob-muted">{t('check.detailsHint')}</span>
            </span>
            <span aria-hidden className="text-ob-muted transition-transform duration-200 group-open:rotate-180">▾</span>
          </summary>
          <div className="border-t border-ob-border px-5 pb-5">
            <AddressCard snapshot={snap} center={view.center} dataSource={view.dataSource} detailsOnly />
          </div>
        </details>

        <p className="text-[0.9375rem] leading-relaxed text-ob-muted">
          {t(`footer.${view.dataSource}`)} {t('footer.disclaimer')}
        </p>
      </div>
    );
  }

  return (
    <PageShell dataSource={view.dataSource} waking={wake === 'waking'}>
      <div className="mx-auto max-w-xl pt-2">
        <Link href="/" className="inline-flex min-h-[48px] items-center gap-2 text-[1.0625rem] font-semibold text-ob-accent">
          <span aria-hidden>←</span> {t('check.back')}
        </Link>
        <h1 className="mt-1 text-[1.625rem] font-bold leading-tight tracking-[-0.01em] text-ob-text">{view.address ?? address}</h1>
        {body}
      </div>
    </PageShell>
  );
}
