'use client';

/* Live hero: owns the address search + status pill. Server passes the initial
 * snapshot (SSR); on search we re-fetch client-side and swap the status in. */

import { useState } from 'react';
import AddressSearch from './AddressSearch';
import StatusInline from './StatusInline';
import { getHomeSnapshot } from '@/lib/api';
import type { HomeSnapshot } from '@/lib/types';

export default function HeroPanel({ initial }: { initial: HomeSnapshot }) {
  const [snap, setSnap] = useState<HomeSnapshot>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      const next = await getHomeSnapshot(address);
      setSnap(next);
    } catch {
      setError('Could not reach the flood service. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
        {error && <p className="mt-2 text-sm text-cs-danger">{error}</p>}
      </div>
    </>
  );
}
