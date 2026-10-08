'use client';

/* The front door, built on the YCGlobe pattern: brand on top, the dataset as
 * the hero, four floating stat cards around it, then the gate — one primary
 * way in ("Enter the map") and one shortcut (check an address). Nothing is
 * gated behind a sign-up. */

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LandingData } from '@/lib/landing';
import FloodGlobe from './FloodGlobe';
import TexasField from './TexasField';
import BrandMark from './BrandMark';

export type LandingVariant = 'a' | 'b';

const CARD_SPOTS = ['left-[6%] top-[14%]', 'right-[6%] top-[22%]', 'left-[3%] bottom-[16%]', 'right-[4%] bottom-[10%]'];

export default function Landing({
  data,
  freshness,
  variant,
  showVariantSwitch,
}: {
  data: LandingData;
  freshness: string;
  variant: LandingVariant;
  showVariantSwitch: boolean;
}) {
  const router = useRouter();
  const [address, setAddress] = useState('');

  const check = (e: FormEvent) => {
    e.preventDefault();
    const q = address.trim();
    router.push(q ? `/map?address=${encodeURIComponent(q)}` : '/map');
  };

  const Hero = variant === 'b' ? TexasField : FloodGlobe;

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center overflow-x-hidden bg-ob-bg px-4 pb-8 text-ob-text">
      <header className="land-in mt-8 flex flex-col items-center gap-1.5 sm:mt-10" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-2 text-ob-accent">
          <BrandMark className="h-7 w-7" />
          <span className="text-[26px] font-semibold tracking-[-0.02em]">BayouGuard</span>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ob-accent">
          Texas floodwater, mapped
        </p>
      </header>

      <section className="relative mt-2 w-full max-w-[1180px]" aria-label="Every gauge in Texas">
        <div className="land-in relative mx-auto h-[min(58vh,520px)] min-h-[300px] w-full max-w-[640px]" style={{ animationDelay: '0ms' }}>
          <Hero dots={data.dots} />
          <p className="sr-only">
            {data.dots.length} river and bayou gauges across Texas, drawn as dots
            {variant === 'b' ? ' on a map of the state' : ' on a globe'}.
          </p>
        </div>

        {data.stats.map((s, i) => (
          <figure
            key={s.label}
            className={`stat-float ob-float pointer-events-none absolute hidden w-[176px] rounded-2xl bg-ob-surface px-4 py-3 lg:block ${CARD_SPOTS[i]}`}
            style={{ animationDelay: `${420 + i * 90}ms, ${i * -1.7}s` }}
          >
            <span className="block text-[22px] font-bold leading-none tracking-[-0.02em] text-ob-accent/80 tabular">
              {s.value}
            </span>
            <figcaption className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ob-muted">
              {s.label}
            </figcaption>
            <p className="mt-1 text-[11px] leading-snug text-ob-faint">{s.detail}</p>
          </figure>
        ))}
      </section>

      <section className="land-in flex w-full max-w-[392px] flex-col items-center text-center" style={{ animationDelay: '220ms' }}>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Every river gauge in Texas.</h1>
        <p className="mt-1 text-[14px] leading-relaxed text-ob-muted">
          Live water levels on one living {variant === 'b' ? 'map' : 'globe'}. Hover to look closer.
        </p>
        <p className="mt-3 text-[12px] text-ob-muted">{freshness}</p>

        <Link
          href="/map"
          className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-ob-accent text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgb(var(--ob-accent-rgb)/0.9)] transition-transform duration-150 hover:brightness-110 active:scale-[0.98]"
        >
          Enter the map
        </Link>

        <form onSubmit={check} className="mt-2.5 flex w-full gap-2">
          <label htmlFor="landing-address" className="sr-only">
            Your Texas address
          </label>
          <input
            id="landing-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Your Texas address"
            autoComplete="street-address"
            className="h-11 min-w-0 flex-1 rounded-xl border border-ob-border bg-ob-surface px-3.5 text-[14px] text-ob-text outline-none transition placeholder:text-ob-faint focus:border-ob-accent/60 focus:shadow-glow"
          />
          <button
            type="submit"
            className="h-11 shrink-0 rounded-xl border border-ob-accent/40 bg-ob-surface px-4 text-[14px] font-semibold text-ob-accent transition hover:bg-ob-accent/5 active:scale-[0.98]"
          >
            Check risk
          </button>
        </form>

        {/* The floating cards need width; small screens get the two that matter. */}
        <dl className="mt-6 grid w-full grid-cols-2 gap-2 lg:hidden">
          {data.stats.slice(0, 2).map((s) => (
            <div key={s.label} className="ob-float rounded-2xl bg-ob-surface px-3.5 py-3 text-left">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ob-muted">{s.label}</dt>
              <dd className="mt-1 text-[20px] font-bold leading-none text-ob-accent/80 tabular">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="mt-auto flex flex-col items-center gap-1 pt-10 text-center text-[11px] text-ob-faint">
        {data.sample && (
          <p className="rounded-full border border-ob-border bg-ob-surface px-3 py-1 text-ob-muted">
            Harris County gauges are sample data until the BayouGuard backend is connected
          </p>
        )}
        <p>Congressional App Challenge 2026 · Data: USGS, Harris County Flood Warning System, Open-Meteo</p>
      </footer>

      {showVariantSwitch && (
        <nav aria-label="Landing variant (development only)" className="fixed right-3 top-3 z-50 flex gap-1 rounded-full border border-ob-border bg-ob-surface p-1 text-[11px] font-semibold shadow-panel">
          {(['a', 'b'] as const).map((v) => (
            <Link
              key={v}
              href={`/?v=${v}`}
              aria-current={variant === v ? 'page' : undefined}
              className={`rounded-full px-2.5 py-1 uppercase ${variant === v ? 'bg-ob-text text-ob-bg' : 'text-ob-muted'}`}
            >
              {v}
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}
