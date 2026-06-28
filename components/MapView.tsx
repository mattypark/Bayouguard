'use client';

/* Full-screen flood map experience. Map fills the viewport; the detail panel
 * rides over it (left rail on desktop, bottom sheet on mobile). The Leaflet map
 * is loaded client-only via next/dynamic. */

import dynamic from 'next/dynamic';
import DetailPanel from './DetailPanel';
import type { FloodView } from '@/lib/types';
import type { Mode } from '@/lib/theme';

const FloodMap = dynamic(() => import('./FloodMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ob-bg2">
      <span className="text-sm text-ob-muted">Loading map…</span>
    </div>
  ),
});

export default function MapView({
  view,
  mode,
  zoomToCenter,
  onBack,
}: {
  view: FloodView;
  mode: Mode;
  zoomToCenter: boolean;
  onBack: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-ob-bg2">
      {/* Map layer */}
      <div className="absolute inset-0">
        <FloodMap
          center={view.center}
          gauges={view.gauges}
          address={view.snapshot.risk.address}
          mode={mode}
          zoomToCenter={zoomToCenter}
        />
      </div>

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="ob-panel absolute left-4 top-4 z-[1000] inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-ob-text shadow-panel transition hover:border-ob-accent/60"
      >
        <span aria-hidden="true">←</span> Back to network
      </button>

      {/* Detail panel — bottom sheet on mobile, left rail on desktop */}
      <aside
        aria-label="Flood detail"
        className="absolute inset-x-0 bottom-0 z-[999] max-h-[55vh] overflow-hidden rounded-t-3xl
                   md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:w-[380px] md:rounded-none"
      >
        <DetailPanel snap={view.snapshot} />
      </aside>
    </div>
  );
}
