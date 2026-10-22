'use client';

/* Free flood alerts, from the people who run the sensors. BayouGuard doesn't
 * send alerts itself (that would need paid services); it points each visitor
 * at the official, free ones — starting with the Harris County gauge nearest
 * their address. */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PageShell from '../PageShell';
import Skeleton from '../Skeleton';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { readLastSearch, readSaved, type SavedAddress } from '@/lib/savedAddress';
import { fetchFloodView } from '@/lib/client';
import { DEMO_ID_BASE } from '@/lib/contract';
import type { BayouReading } from '@/lib/types';

const HCFWS = 'https://www.harriscountyfws.org';
const READY_HARRIS = 'https://www.readyharris.org';

// Demo gauges sit at real HCFWS sites (id offset by DEMO_ID_BASE).
function siteId(id: number): number {
  return id >= DEMO_ID_BASE ? id - DEMO_ID_BASE : id;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-ob-border bg-ob-surface p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ob-accent text-[1.125rem] font-bold text-ob-onaccent"
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.25rem] font-semibold leading-snug text-ob-text">{title}</h2>
          <div className="mt-2 text-[1.0625rem] leading-relaxed text-ob-text">{children}</div>
        </div>
      </div>
    </li>
  );
}

const BIG =
  'mt-4 flex min-h-[56px] w-full items-center gap-3 rounded-xl px-5 text-left text-[1.125rem] font-semibold transition hover:brightness-110';

function OutLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  const { t } = useI18n();
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${BIG} ${primary ? 'bg-ob-accent text-ob-onaccent' : 'border-2 border-ob-border bg-ob-surface text-ob-accent'}`}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <span aria-hidden>↗</span>
      <span className="sr-only">{t('alerts.newTab')}</span>
    </a>
  );
}

function HowTo({ steps }: { steps: MsgKey[] }) {
  const { t } = useI18n();
  return (
    <ol className="mt-2 list-decimal pl-6 text-[1.0625rem] leading-relaxed">
      {steps.map((k) => (
        <li key={k}>{t(k)}</li>
      ))}
    </ol>
  );
}

export default function AlertsView({
  initialAddress,
  initialCoords,
}: {
  initialAddress?: string;
  initialCoords?: { lat: number; lng: number };
}) {
  const { t, lang, num } = useI18n();
  const [place, setPlace] = useState<SavedAddress | null>(
    initialAddress ? { label: initialAddress, ...initialCoords } : null,
  );
  const [nearest, setNearest] = useState<BayouReading | null>(null);
  const [loading, setLoading] = useState(false);

  // Whose bayou? The address handed in, else the saved one, else the last search.
  useEffect(() => {
    if (!place) setPlace(readSaved() ?? readLastSearch());
  }, [place]);

  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    setLoading(true);
    const coords = place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : undefined;
    fetchFloodView(place.label, coords, 15_000, lang, true)
      .then((v) => !cancelled && setNearest(v.snapshot?.bayous[0] ?? null))
      .catch(() => !cancelled && setNearest(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [place, lang]);

  return (
    <PageShell>
      <div className="mx-auto max-w-xl pt-4">
        <h1 className="text-[1.875rem] font-bold leading-tight tracking-[-0.01em] text-ob-text">{t('alerts.title')}</h1>
        <p className="mt-2 text-[1.125rem] leading-relaxed text-ob-muted">{t('alerts.intro')}</p>

        <ol className="mt-6 flex flex-col gap-4">
          <Step n={1} title={t('alerts.bayou.title')}>
            {loading ? (
              <Skeleton className="mt-2 h-14 w-full" />
            ) : nearest ? (
              <>
                <p>{t('alerts.bayou.near', { name: nearest.name, miles: num(nearest.miles, 1), address: place?.label ?? '' })}</p>
                <OutLink href={`${HCFWS}/GageDetail/Index/${siteId(nearest.id)}`} primary>
                  {t('alerts.bayou.open', { name: nearest.name })}
                </OutLink>
                <p className="mt-3 text-[1rem] text-ob-muted">{t('alerts.bayou.then')}</p>
              </>
            ) : (
              <>
                <p>{t('alerts.bayou.none')}</p>
                <Link href="/" className={`${BIG} bg-ob-accent text-ob-onaccent`}>
                  <span className="flex-1">{t('alerts.bayou.search')}</span>
                  <span aria-hidden>→</span>
                </Link>
                <OutLink href={HCFWS}>{t('alerts.bayou.all')}</OutLink>
              </>
            )}
          </Step>

          <Step n={2} title={t('alerts.county.title')}>
            <p>{t('alerts.county.body')}</p>
            <OutLink href={READY_HARRIS}>{t('alerts.county.open')}</OutLink>
          </Step>

          <Step n={3} title={t('alerts.phone.title')}>
            <p>{t('alerts.phone.body')}</p>
            <p className="mt-3 font-semibold">iPhone</p>
            <HowTo steps={['alerts.phone.ios.1', 'alerts.phone.ios.2']} />
            <p className="mt-3 font-semibold">Android</p>
            <HowTo steps={['alerts.phone.android.1', 'alerts.phone.android.2']} />
          </Step>

          <Step n={4} title={t('alerts.home.title')}>
            <p>{t('alerts.home.body')}</p>
            <p className="mt-3 font-semibold">iPhone</p>
            <HowTo steps={['alerts.home.ios.1', 'alerts.home.ios.2']} />
            <p className="mt-3 font-semibold">Android</p>
            <HowTo steps={['alerts.home.android.1', 'alerts.home.android.2']} />
          </Step>
        </ol>

        <p className="mt-6 text-[1rem] leading-relaxed text-ob-muted">{t('alerts.why')}</p>
      </div>
    </PageShell>
  );
}
