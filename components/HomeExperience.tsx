'use client';

/* The map screen. One persistent chrome layer over a swappable background:
 *   map   — real Leaflet map, gauges plotted at their true coordinates
 *   graph — abstract force-directed watershed node network
 * Chrome: the top bar (brand, search, view controls), the left rail (network
 * counts that double as risk filters, map layers), the right column (the
 * gauges closest to flooding, replaced by the inspector when something is
 * picked), and a first-visit tour. Searching an address refreshes the flood
 * view and focuses it; picking any gauge opens the inspector. */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type L from 'leaflet';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar, { type Lang, type ViewMode } from './TopBar';
import WatershedGraph, { type GraphSelection } from './WatershedGraph';
import AddressSearch from './AddressSearch';
import NetworkStats from './NetworkStats';
import TexasLocator from './TexasLocator';
import InspectorPanel from './InspectorPanel';
import MapRail from './MapRail';
import RiskBoard from './RiskBoard';
import Tour from './Tour';
import MapIntro from './MapIntro';
import { DEFAULT_LAYERS, type MapLayers } from './LayerControl';
import { fetchFloodView } from '@/lib/client';
import { useTheme } from '@/lib/useTheme';
import type { FloodView, GaugePoint, Tier } from '@/lib/types';
import { readHandoff, type Handoff } from '@/lib/dotField';

// Leaflet touches window — load the map background client-only.
const FloodMap = dynamic(() => import('./FloodMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-ob-bg" />,
});

/* checking — deciding (first client frame) whether we came from the landing
 * playing   — MapIntro is melting the landing's dots into the map
 * done      — chrome slides in; normal use */
type IntroState = 'checking' | 'playing' | 'done';

const ADDRESS_SELECTION: GraphSelection = { id: 'address', kind: 'address' };

export default function HomeExperience({
  initial,
  initialAddress,
}: {
  initial: FloodView;
  /** Set when arriving from the landing page's address box. */
  initialAddress?: string;
}) {
  const [view, setView] = useState<FloodView>(initial);
  const [mode, setMode] = useState<ViewMode>('map');
  const [lang, setLang] = useState<Lang>('EN');
  const { mode: theme, toggle: toggleTheme } = useTheme();
  const [selection, setSelection] = useState<GraphSelection | null>(
    initialAddress && initial.center ? ADDRESS_SELECTION : null,
  );
  const [focus, setFocus] = useState<GaugePoint | null>(null);
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [hiddenTiers, setHiddenTiers] = useState<ReadonlySet<Tier>>(new Set());
  const [searched, setSearched] = useState(Boolean(initialAddress && initial.center));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [intro, setIntro] = useState<IntroState>('checking');
  const [liveMap, setLiveMap] = useState<L.Map | null>(null);

  // Before paint, so the landing's last frame is covered from the first frame.
  // Once only: reading consumes the hand-off, and React's dev double-run of
  // effects would otherwise find it gone and skip the intro.
  const checked = useRef(false);
  useLayoutEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const h = readHandoff(true);
    if (h) {
      setHandoff(h);
      setIntro('playing');
      return;
    }
    // A direct visit: let one frame paint with the chrome off-stage, so its
    // slide-in actually transitions.
    requestAnimationFrame(() => setIntro('done'));
  }, []);

  // Memoized so the map's per-gauge ripple icons survive unrelated re-renders.
  const visible = useMemo(
    () => view.gauges.filter((g) => !hiddenTiers.has(g.tier)),
    [view.gauges, hiddenTiers],
  );

  const toggleTier = (t: Tier) =>
    setHiddenTiers((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

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

  const pickGauge = (g: GaugePoint) => {
    setSelection({ id: `g${g.id}`, kind: 'gauge', gauge: g });
    setFocus(g);
  };

  const otherMode: ViewMode = mode === 'map' ? 'graph' : 'map';
  const sample = Boolean(view.sample);

  return (
    <div className="fixed inset-0 overflow-hidden bg-ob-bg" data-chrome={intro === 'done' ? 'in' : 'out'}>
      {/* ── BACKGROUND (swappable) ──
          z-0 establishes a stacking context so Leaflet's internal panes
          (z-index 400-700) stay trapped below the chrome layers above. */}
      <div className="absolute inset-0 z-0">
        {intro === 'checking' ? null : mode === 'map' ? (
          <FloodMap
            center={view.center}
            gauges={visible}
            address={view.snapshot.risk.address}
            mode={theme}
            zoomToCenter={searched}
            selectedId={selection?.id ?? null}
            onSelect={setSelection}
            layers={layers}
            focusGauge={focus}
            initialView={handoff ? { lat: handoff.lat, lng: handoff.lng, zoom: handoff.zoom } : null}
            onReady={intro === 'playing' ? setLiveMap : undefined}
          />
        ) : (
          <WatershedGraph
            gauges={visible}
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
        search={<AddressSearch onSearch={onSearch} initialValue={initialAddress} />}
        className="chrome chrome-top"
      />

      {/* Search status, just under the bar */}
      <div className="pointer-events-none absolute inset-x-0 top-[116px] z-[60] flex justify-center px-4 md:top-[68px]">
        {loading && (
          <span className="ob-panel ob-float inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-ob-muted">
            <span className="spin h-3 w-3 rounded-full border-2 border-ob-accent border-t-transparent" />
            Reading gauges…
          </span>
        )}
        {error && (
          <span className="rounded-full border border-tier-high/40 bg-ob-surface px-3 py-1 text-xs text-tier-high">
            {error}
          </span>
        )}
      </div>

      {/* Left rail (desktop) */}
      <div className="chrome chrome-left chrome-d1 pointer-events-none absolute bottom-4 left-4 top-[76px] z-40 hidden lg:flex lg:items-start">
        <div className="pointer-events-auto max-h-full">
          <MapRail
            gauges={view.gauges}
            sample={sample}
            hidden={hiddenTiers}
            onToggleTier={toggleTier}
            layers={layers}
            onLayers={setLayers}
            showLayers={mode === 'map'}
          />
        </div>
      </div>

      {/* Network strip (below lg, where the rail doesn't fit) */}
      {!selection && (
        <div className="chrome chrome-bottom chrome-d2 pointer-events-none absolute bottom-16 left-3 z-40 lg:hidden">
          <NetworkStats gauges={view.gauges} />
        </div>
      )}

      {/* Right column: leaderboard until something is picked */}
      {!selection && (
        <div className="chrome chrome-right chrome-d2 pointer-events-none absolute right-4 top-[76px] z-40 hidden lg:block">
          <div className="pointer-events-auto">
            <RiskBoard gauges={visible} sample={sample} onPick={pickGauge} />
          </div>
        </div>
      )}

      {/* Texas locator — only the graph needs telling where it is */}
      {mode === 'graph' && !selection && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-40 hidden md:block">
          <TexasLocator />
        </div>
      )}

      {/* Hint (bottom-center) */}
      {!selection && (
        <div className="chrome chrome-bottom chrome-d3 pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <p className="ob-panel rounded-full px-4 py-1.5 text-center text-[11px] text-ob-muted">
            {mode === 'map'
              ? 'Drag to pan · scroll to zoom · tap a gauge to inspect'
              : 'Drag to pan · scroll to zoom · tap a node to inspect'}
          </p>
        </div>
      )}

      {/* Inspector (right column desktop / bottom sheet mobile) */}
      <AnimatePresence>
        {selection && intro === 'done' && (
          <motion.aside
            key="inspector"
            aria-label="Gauge inspector"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-3 bottom-3 z-[80] max-h-[58vh]
                       md:inset-x-auto md:bottom-4 md:right-4 md:top-[76px] md:max-h-none md:w-[360px]"
          >
            <InspectorPanel
              selection={selection}
              snapshot={view.snapshot}
              center={view.center}
              switchLabel={otherMode === 'map' ? 'View on map' : 'View as graph'}
              onSwitch={() => setMode(otherMode)}
              onClose={() => {
                setSelection(null);
                setFocus(null);
              }}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Covers the first client frame while we decide; then the intro or nothing. */}
      {intro === 'checking' && <div className="fixed inset-0 z-[90] bg-ob-bg" aria-hidden="true" />}
      {intro === 'playing' && handoff && (
        <MapIntro handoff={handoff} map={liveMap} mode={theme} onDone={() => setIntro('done')} />
      )}

      <Tour ready={intro === 'done'} />
    </div>
  );
}
