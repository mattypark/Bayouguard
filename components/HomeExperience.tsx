'use client';

/* Home orchestrator. Owns the two modes:
 *   hero  — Texas map background, wordmark, address search, live status pill
 *   map   — full-screen Leaflet flood map + detail panel
 * An explicit search fetches the flood view and slides the hero away into the map. */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TexasMap from './TexasMap';
import AddressSearch from './AddressSearch';
import StatusInline from './StatusInline';
import MapView from './MapView';
import { fetchFloodView } from '@/lib/client';
import type { FloodView } from '@/lib/types';

export default function HomeExperience({ initial }: { initial: FloodView }) {
  const [view, setView] = useState<FloodView>(initial);
  const [mode, setMode] = useState<'hero' | 'map'>('hero');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async (
    address: string,
    submitted: boolean,
    coords?: { lat: number; lng: number },
  ) => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchFloodView(address, coords);
      setView(next);
      if (submitted) setMode('map');
    } catch {
      setError('Could not reach the flood service. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const snap = view.snapshot;

  return (
    <>
      {/* HERO */}
      <motion.section
        className="relative"
        animate={{
          opacity: mode === 'map' ? 0 : 1,
          scale: mode === 'map' ? 0.97 : 1,
        }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Background Texas map — real boundary, very soft */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <TexasMap
            className="h-[120%] w-[110%] max-w-[1100px] opacity-70 md:opacity-80"
            showHoustonPin
          />
          <div className="absolute inset-0 bg-gradient-to-b from-cs-sky/85 via-cs-sky/30 to-cs-sky" />
        </div>

        {/* Foreground */}
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-16 pb-24 text-center md:px-6 md:pt-24 md:pb-32">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cs-teal">
            Houston · TX-07 · Live
          </p>

          <h1 className="font-serif text-5xl leading-none text-cs-navy md:text-7xl">
            BayouGuard
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-cs-midnight/80 md:text-lg">
            Flood risk for your Houston address — before the water rises.
          </p>

          <div className="mt-8 w-full max-w-xl">
            <AddressSearch onSearch={onSearch} />
          </div>

          <div className="mt-6 min-h-[2.75rem]">
            {loading ? (
              <span
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-2 rounded-full border border-cs-border bg-white/85 px-4 py-2 text-sm text-cs-steel shadow-sm backdrop-blur"
              >
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cs-teal" />
                Checking flood gauges…
              </span>
            ) : (
              <StatusInline
                tier={snap.risk.tier}
                score={snap.risk.score}
                message={snap.risk.message}
                updatedAt={snap.risk.updatedAt}
              />
            )}
            {error && <p className="mt-2 text-sm text-risk-high">{error}</p>}
          </div>
        </div>
      </motion.section>

      {/* MAP OVERLAY */}
      <AnimatePresence>
        {mode === 'map' && (
          <motion.div
            key="mapview"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <MapView view={view} onBack={() => setMode('hero')} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
