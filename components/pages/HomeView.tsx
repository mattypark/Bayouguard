'use client';

/* The front door: one question, one box, one big button. Built so an
 * 80-year-old can use it without help — large type, plain words, nothing to
 * figure out — and so it still feels quick and crisp to a teenager. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PageShell from '../PageShell';
import AddressSearch from '../AddressSearch';
import { LocateIcon, EXAMPLES } from '../WelcomeCard';
import { useI18n } from '@/lib/i18n';
import { readSaved, type SavedAddress } from '@/lib/savedAddress';
import { warmBackend } from '@/lib/client';

export function checkHref(address: string, coords?: { lat: number; lng: number }): string {
  const p = new URLSearchParams({ address });
  if (coords) {
    p.set('lat', coords.lat.toFixed(5));
    p.set('lng', coords.lng.toFixed(5));
  }
  return `/check?${p.toString()}`;
}

export default function HomeView({ network }: { network: { total: number; near: number; live: boolean } | null }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [saved, setSaved] = useState<SavedAddress | null>(null);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Start the backend waking while the visitor types.
  useEffect(() => {
    warmBackend();
    setSaved(readSaved());
    router.prefetch('/check');
  }, [router]);

  const go = (address: string, c?: { lat: number; lng: number }) => router.push(checkHref(address, c));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      setMessage(t('home.empty'));
      return;
    }
    go(q, coords);
  };

  const locate = () => {
    setMessage(null);
    if (!('geolocation' in navigator)) {
      setMessage(t('locate.unavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        let label: string | null = null;
        try {
          const res = await fetch(`/api/reverse?lat=${c.lat}&lng=${c.lng}`);
          if (res.ok) label = (await res.json()).label;
        } catch {
          // Use the generic label.
        }
        go(label ?? t('locate.yourLocation'), c);
      },
      (err) => {
        setLocating(false);
        setMessage(t(err.code === err.PERMISSION_DENIED ? 'locate.denied' : 'locate.unavailable'));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const big =
    'flex h-14 w-full items-center justify-center gap-2 rounded-xl text-[1.125rem] font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60';

  return (
    <PageShell>
      <div className="mx-auto max-w-xl pt-6 sm:pt-12">
        <h1 className="reveal text-[2rem] font-bold leading-[1.15] tracking-[-0.02em] text-ob-text sm:text-[2.5rem]">
          {t('home.title')}
        </h1>
        <p className="reveal mt-3 text-[1.125rem] leading-relaxed text-ob-muted">{t('home.subtitle')}</p>

        <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-3">
          <AddressSearch
            variant="field"
            large
            label={t('home.addressLabel')}
            onValue={(v, c) => {
              setValue(v);
              setCoords(c);
              setMessage(null);
            }}
          />
          <button type="submit" className={`${big} bg-ob-accent text-ob-onaccent`}>
            {t('home.check')}
          </button>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className={`${big} border-2 border-ob-border bg-ob-surface text-ob-accent hover:bg-ob-bg`}
          >
            <LocateIcon className="h-5 w-5" />
            {locating ? t('home.locating') : t('home.locate')}
          </button>
          {message && (
            <p role="alert" className="text-[1rem] text-ob-text">
              {message}
            </p>
          )}
        </form>

        {saved && (
          <button
            type="button"
            onClick={() => go(saved.label, saved.lat != null && saved.lng != null ? { lat: saved.lat, lng: saved.lng } : undefined)}
            className="mt-4 flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-ob-border bg-ob-surface px-4 text-left text-[1.0625rem] text-ob-text hover:bg-ob-bg"
          >
            <span aria-hidden className="text-ob-accent">★</span>
            <span className="min-w-0 flex-1">{t('home.again', { address: saved.label })}</span>
            <span aria-hidden className="text-ob-muted">→</span>
          </button>
        )}

        <div className="mt-8">
          <p className="text-[1rem] font-medium text-ob-muted">{t('home.try')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e.label}
                type="button"
                onClick={() => go(e.query, { lat: e.lat, lng: e.lng })}
                className="h-12 rounded-full border border-ob-border bg-ob-surface px-5 text-[1rem] font-semibold text-ob-accent transition-colors hover:bg-ob-bg"
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {network && (
          <Link
            href="/map"
            className="mt-10 flex items-center gap-3 rounded-xl border border-ob-border bg-ob-surface p-4 transition-colors hover:bg-ob-bg"
          >
            <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${network.live ? 'bg-tier-low' : 'bg-tier-med'}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-[1rem] font-semibold text-ob-text">
                {t('home.network', { total: network.total.toLocaleString(locale), near: network.near })}
              </span>
              <span className="block text-[0.9375rem] text-ob-accent">{t('home.explore')} →</span>
            </span>
          </Link>
        )}

        <p className="mt-6 text-[0.9375rem] text-ob-muted">{t('home.free')}</p>
      </div>
    </PageShell>
  );
}
