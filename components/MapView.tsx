'use client';

/* Full-screen flood map experience. Map fills the viewport; the detail panel
 * rides over it (left rail on desktop, bottom sheet on mobile). The Leaflet map
 * is loaded client-only via next/dynamic. */

import dynamic from 'next/dynamic';
import DetailPanel from './DetailPanel';
import type { FloodView } from '@/lib/types';

const FloodMap = dynamic(() => import('./FloodMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-cs-sky">
      <span className="text-sm text-cs-steel">Loading map…</span>
    </div>
  ),
});

export default function MapView({
  view,
  onBack,
}: {
  view: FloodView;
  onBack: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-cs-sky">
      {/* Map layer */}
      <div className="absolute inset-0">
        <FloodMap
          center={view.center}
          gauges={view.gauges}
          address={view.snapshot.risk.address}
        />
      </div>

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 top-4 z-[1000] inline-flex items-center gap-2 rounded-full border border-cs-border bg-white/95 px-4 py-2 text-sm font-semibold text-cs-navy shadow-md backdrop-blur transition hover:bg-white"
      >
        ← New search
      </button>

      {/* Detail panel — bottom sheet on mobile, left rail on desktop */}
      <aside
        className="absolute inset-x-0 bottom-0 z-[999] max-h-[55vh] overflow-hidden rounded-t-3xl border-t border-cs-border bg-white/95 shadow-2xl backdrop-blur
                   md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:w-[380px] md:rounded-none md:rounded-r-3xl md:border-l-0 md:border-t-0 md:border-r"
      >
        <DetailPanel snap={view.snapshot} />
      </aside>
    </div>
  );
}
