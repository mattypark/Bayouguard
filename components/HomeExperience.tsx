'use client';

/* Home orchestrator (dark / Obsidian). One persistent chrome layer — search,
 * legend, Texas locator, inspector — sits over a swappable background:
 *   map   — real Leaflet map, gauges plotted at their true coordinates
 *   graph — abstract force-directed watershed node network
 * The Graph/Map toggle only changes the background; everything else is shared.
 * Searching an address refreshes the flood view and focuses the location;
 * clicking any gauge (on the map or in the graph) opens the inspector. */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar, { type Lang, type ViewMode } from './TopBar';
import WatershedGraph, { type GraphSelection } from './WatershedGraph';
import AddressSearch from './AddressSearch';
import NetworkStats from './NetworkStats';
import TexasLocator from './TexasLocator';
import InspectorPanel from './InspectorPanel';
import { fetchFloodView } from '@/lib/client';
import { useTheme } from '@/lib/useTheme';
import type { FloodView } from '@/lib/types';

// Leaflet touches window — load the map background client-only.
const FloodMap = dynamic(() => import('./FloodMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ob-bg2">
      <span className="text-sm text-ob-muted">Loading map…</span>
    </div>
  ),
});

const ADDRESS_SELECTION: GraphSelection = { id: 'address', kind: 'address' };

export default function HomeExperience({ initial }: { initial: FloodView }) {
  const [view, setView] = useState<FloodView>(initial);
  const [mode, setMode] = useState<ViewMode>('map');
  const [lang, setLang] = useState<Lang>('EN');
  const { mode: theme, toggle: toggleTheme } = useTheme();
  const [selection, setSelection] = useState<GraphSelection | null>(null);
  const [searched, setSearched] = useState(false);
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
      if (submitted) {
        setSelection(ADDRESS_SELECTION);
        setSearched(true);
      }
    } catch {
      setError('Could not reach the flood service. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const otherMode: ViewMode = mode === 'map' ? 'graph' : 'map';

  return (
    <div className="fixed inset-0 overflow-hidden bg-ob-bg">
      {/* ── BACKGROUND (swappable) ──
          z-0 establishes a stacking context so Leaflet's internal panes
          (z-index 400-700) stay trapped below the chrome layers above. */}
      <div className="absolute inset-0 z-0">
        {mode === 'map' ? (
          <FloodMap
            center={view.center}
            gauges={view.gauges}
            address={view.snapshot.risk.address}
            mode={theme}
            zoomToCenter={searched}
            selectedId={selection?.id ?? null}
            onSelect={setSelection}
          />
        ) : (
          <WatershedGraph
            gauges={view.gauges}
            center={view.center}
            address={view.snapshot.risk.address}
            mode={theme}
            active={mode === 'graph'}
            selectedId={selection?.id ?? null}
            onSelect={setSelection}
          />
        )}
      </div>

      {/* ── CHROME (shared across both backgrounds) ── */}
      <TopBar
        mode={mode}
        onMode={setMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        lang={lang}
        onLang={setLang}
      />

      {/* Search (top-center) */}
      <div className="pointer-events-none absolute inset-x-0 top-16 z-[70] flex flex-col items-center px-4 pt-3">
        <div className="pointer-events-auto w-full max-w-xl">
          <AddressSearch onSearch={onSearch} />
        </div>
        <div className="mt-2 h-6">
          {loading && (
            <span className="inline-flex items-center gap-2 rounded-full border border-ob-border bg-ob-surface/80 px-3 py-1 text-xs text-ob-muted backdrop-blur">
              <span className="h-3 w-3 rounded-full border-2 border-ob-accent border-t-transparent spin" />
              Reading gauges…
            </span>
          )}
          {error && (
            <span className="rounded-full border border-tier-high/40 bg-tier-high/10 px-3 py-1 text-xs text-tier-high">
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Network stats (bottom-left) */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-40 hidden sm:block">
        <NetworkStats gauges={view.gauges} />
      </div>

      {/* Texas locator (bottom-right) — hidden while the inspector is open */}
      {!selection && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-40 hidden md:block">
          <TexasLocator />
        </div>
      )}

      {/* Hint (bottom-center) */}
      {!selection && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
          <p className="rounded-full border border-ob-border bg-ob-surface/60 px-4 py-1.5 text-center text-[11px] text-ob-faint backdrop-blur">
            {mode === 'map'
              ? 'Drag to pan · scroll to zoom · tap a gauge to inspect'
              : 'Drag to pan · scroll to zoom · tap a node to inspect'}
          </p>
        </div>
      )}

      {/* Inspector (right rail desktop / bottom sheet mobile) */}
      <AnimatePresence>
        {selection && (
          <motion.aside
            key="inspector"
            aria-label="Gauge inspector"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-[80] inset-x-3 bottom-3 max-h-[58vh]
                       md:inset-x-auto md:right-4 md:top-28 md:bottom-4 md:w-[360px] md:max-h-none"
          >
            <InspectorPanel
              selection={selection}
              snapshot={view.snapshot}
              center={view.center}
              switchLabel={otherMode === 'map' ? 'View on map' : 'View as graph'}
              onSwitch={() => setMode(otherMode)}
              onClose={() => setSelection(null)}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
