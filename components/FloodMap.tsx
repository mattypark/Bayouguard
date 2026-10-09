'use client';

/* Interactive Leaflet map of Texas, and only Texas: panning is clamped to the
 * state, minZoom is computed from its bounds so even ultrawide windows can't
 * zoom past it, and everything outside the border is masked to the page's
 * paper colour. Zoom stops where the basemap's tiles stop (16), so labels are
 * never stretched into blurry giants. Composable
 * layers controlled by the LayerControl checkboxes: risk-tier gauge dots,
 * "tsunami" ripple pulses, animated wind flow, satellite imagery, and the
 * statewide USGS context network. Loaded client-only (Leaflet touches window). */

import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Pane,
  Polygon,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GaugePoint, Tier } from '@/lib/types';
import type { UsgsGauge } from '@/lib/usgs';
import { TIER_COLOR, OB, type Mode } from '@/lib/theme';
import { TEXAS_RINGS } from '@/lib/geoDots';
import type { MapLayers } from './LayerControl';
import WindLayer from './WindLayer';

export interface MapSelection {
  id: string;
  kind: 'gauge' | 'address';
  gauge?: GaugePoint;
}

const HOUSTON: [number, number] = [29.7604, -95.3698];

// Texas's extent with a sliver of margin, so the border isn't flush with the
// screen edge at the widest zoom.
const REGION_BOUNDS: [[number, number], [number, number]] = [
  [25.4, -107.1], // SW
  [36.9, -93.1], // NE
];
// The grey canvas basemap has tiles to 16. Past that Leaflet stretches them
// and the labels turn into blurred giants, so the map stops here.
const MAX_ZOOM = 16;
const ESRI_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
const CANVAS_NATIVE_ZOOM = MAX_ZOOM;

const TEXAS_LINES = TEXAS_RINGS.map((ring) => ring.map(([lat, lng]) => [lat, lng] as [number, number]));
// How far past the viewport the mask's outer edge reaches, in viewports — enough
// that a pan or a one-level zoom-out never shows its edge before it's redrawn.
const MASK_PAD = 1.5;
const ESRI_ATTRIBUTION = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

// Regional zoom shows the gauge cluster in statewide Texas context; street zoom
// is reserved for an explicit address search.
const REGION_ZOOM = 7;
const ADDRESS_ZOOM = 13;
const GAUGE_ZOOM = 11;

// Ripple pulse speed per tier — critical gauges pulse hard and fast.
const RIPPLE_DURATION: Record<Tier, string> = {
  LOW: '3.6s',
  MEDIUM: '2.6s',
  HIGH: '1.7s',
  CRITICAL: '1.1s',
};
const RIPPLE_SIZE: Record<Tier, number> = {
  LOW: 30,
  MEDIUM: 38,
  HIGH: 48,
  CRITICAL: 58,
};

// Teardrop pin for the searched address, built as a DivIcon so we ship no image
// assets. `accent` and the inner hole adapt to the active theme.
function makeAddressIcon(accent: string, hole: string) {
  return L.divIcon({
    className: '',
    html:
      '<div style="position:relative;width:26px;height:34px;filter:drop-shadow(0 0 6px ' +
      accent +
      ');">' +
      '<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M13 0C5.8 0 0 5.8 0 13c0 9 13 21 13 21s13-12 13-21C26 5.8 20.2 0 13 0z" fill="' +
      accent +
      '"/>' +
      '<circle cx="13" cy="13" r="5" fill="' +
      hole +
      '"/></svg></div>',
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -32],
  });
}

function makeRippleIcon(tier: Tier) {
  const size = RIPPLE_SIZE[tier];
  // Random negative delay desynchronizes the pulses across gauges.
  const delay = `-${(Math.random() * 4).toFixed(2)}s`;
  return L.divIcon({
    className: '',
    html:
      `<div class="gauge-ripple" style="position:absolute;inset:0;` +
      `--ripple-color:${TIER_COLOR[tier]};--ripple-duration:${RIPPLE_DURATION[tier]};` +
      `--ripple-delay:${delay};">` +
      '<span></span><span></span></div>',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* Fly to a gauge picked outside the map (the leaderboard), without zooming
 * back out if the reader is already closer than street-level context. */
function FocusGauge({ gauge }: { gauge: GaugePoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!gauge) return;
    map.flyTo([gauge.lat, gauge.lng], Math.max(map.getZoom(), GAUGE_ZOOM), { duration: 0.9 });
  }, [gauge, map]);
  return null;
}

/* Hands the map out once it's laid out and its first tiles are in (or after a
 * short wait), so the intro can melt the dots into a map that's really there. */
/* Everything that isn't Texas, as a polygon with every Texas ring cut out of
 * it. The outer ring follows the viewport instead of spanning the world: at
 * street zoom a world-sized ring is millions of pixels across and the browser
 * gives up drawing it — the whole map went blank. noClip keeps Leaflet from
 * clipping the holes away once you're zoomed inside Texas. */
function TexasMask({ fill }: { fill: string }) {
  const map = useMap();
  const [outer, setOuter] = useState<Array<[number, number]>>(() => viewRing(map));
  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setOuter(viewRing(map)));
    };
    map.on('move zoomend resize', update);
    return () => {
      cancelAnimationFrame(raf);
      map.off('move zoomend resize', update);
    };
  }, [map]);
  return (
    <Polygon
      positions={[outer, ...TEXAS_LINES]}
      interactive={false}
      noClip
      pathOptions={{ stroke: false, fillColor: fill, fillOpacity: 1 }}
    />
  );
}

function viewRing(map: L.Map): Array<[number, number]> {
  const b = map.getBounds().pad(MASK_PAD);
  return [
    [b.getSouth(), b.getWest()],
    [b.getNorth(), b.getWest()],
    [b.getNorth(), b.getEast()],
    [b.getSouth(), b.getEast()],
  ];
}

function ReadyProbe({ onReady }: { onReady?: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onReady) return;
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      onReady(map);
    };
    const timer = window.setTimeout(fire, 1400);
    map.whenReady(() => {
      let tiles: L.TileLayer | null = null;
      map.eachLayer((layer) => {
        if (!tiles && layer instanceof L.TileLayer) tiles = layer;
      });
      if (tiles) (tiles as L.TileLayer).once('load', fire);
      else fire();
    });
    return () => window.clearTimeout(timer);
  }, [map, onReady]);
  return null;
}

function Recenter({
  center,
  zoomToCenter,
}: {
  center: [number, number] | null;
  zoomToCenter: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (center && zoomToCenter) map.flyTo(center, ADDRESS_ZOOM, { duration: 1.1 });
  }, [center, zoomToCenter, map]);
  return null;
}

/* maxBounds only clamps panning — a wide window at a fixed minZoom can still
 * see far past the region. Recompute minZoom from the bounds so the viewport
 * is never larger than Texas-plus-margin, at any window size. */
function ClampToRegion({ fitOnStart }: { fitOnStart: boolean }) {
  const map = useMap();
  // A plain visit opens on the whole state.
  useEffect(() => {
    if (fitOnStart) map.fitBounds(REGION_BOUNDS, { animate: false });
    // Only on mount — later searches move the map themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  useEffect(() => {
    const apply = () => {
      // Zoomed out as far as the whole state, no further — the mask covers the rest.
      const z = map.getBoundsZoom(REGION_BOUNDS, false);
      map.setMinZoom(z);
      if (map.getZoom() < z) map.setZoom(z);
    };
    apply();
    map.on('resize', apply);
    return () => {
      map.off('resize', apply);
    };
  }, [map]);
  return null;
}

export default function FloodMap({
  center,
  gauges,
  address,
  mode,
  zoomToCenter,
  selectedId,
  onSelect,
  layers,
  focusGauge = null,
  initialView,
  onReady,
}: {
  center: { lat: number; lng: number } | null;
  gauges: GaugePoint[];
  address?: string;
  mode: Mode;
  zoomToCenter: boolean;
  selectedId?: string | null;
  onSelect?: (sel: MapSelection | null) => void;
  layers: MapLayers;
  /** A gauge chosen outside the map, to fly to. */
  focusGauge?: GaugePoint | null;
  /** Where to open — set when arriving from the landing's zoom. */
  initialView?: { lat: number; lng: number; zoom: number } | null;
  /** Called once the map is laid out and its first tiles have loaded. */
  onReady?: (map: L.Map) => void;
}) {
  const start: [number, number] = initialView
    ? [initialView.lat, initialView.lng]
    : center
      ? [center.lat, center.lng]
      : HOUSTON;
  const startZoom = initialView
    ? initialView.zoom
    : zoomToCenter && center
      ? ADDRESS_ZOOM
      : REGION_ZOOM;
  const maskColor = mode === 'light' ? OB.bg : '#0f0f11';
  const borderColor = mode === 'light' ? 'rgba(27,24,20,0.55)' : 'rgba(242,238,230,0.5)';
  // Esri's keyless grey canvas, base and labels as two layers. CARTO's free
  // basemaps now stamp "API KEY REQUIRED" over every tile.
  const canvas = mode === 'light' ? 'World_Light_Gray' : 'World_Dark_Gray';
  const tileBase = `${ESRI_CANVAS}/${canvas}_Base/MapServer/tile/{z}/{y}/{x}`;
  const tileLabels = `${ESRI_CANVAS}/${canvas}_Reference/MapServer/tile/{z}/{y}/{x}`;
  // A white keyline lifts the tier fill off cream tiles; ink marks the selection.
  const strokeColor = mode === 'light' ? '#ffffff' : '#0f0f11';
  const selectedStroke = mode === 'light' ? OB.text : '#ffffff';
  const windColor = mode === 'light' ? 'rgba(26,92,255,0.7)' : 'rgba(150,180,255,0.85)';
  const usgsColor = mode === 'light' ? '#8c8274' : '#9a9286';
  const addressIcon = useMemo(
    () =>
      mode === 'light'
        ? makeAddressIcon(OB.accent, OB.bg)
        : makeAddressIcon('#6894ff', '#0f0f11'),
    [mode],
  );
  // Per-gauge icons (not per-tier) so every gauge pulses on its own phase;
  // memoized on the gauge list so selection clicks don't restart animations.
  const rippleIcons = useMemo(
    () => new Map(gauges.map((g) => [g.id, makeRippleIcon(g.tier)])),
    [gauges],
  );

  // Statewide USGS context layer — fetched once on demand, kept for the session.
  const [usgs, setUsgs] = useState<UsgsGauge[] | null>(null);
  useEffect(() => {
    if (!layers.usgs || usgs !== null) return;
    let cancelled = false;
    fetch('/api/usgs-gauges')
      .then((res) => (res.ok ? res.json() : { gauges: [] }))
      .then((data: { gauges: UsgsGauge[] }) => {
        if (!cancelled) setUsgs(data.gauges ?? []);
      })
      .catch(() => {
        if (!cancelled) setUsgs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [layers.usgs, usgs]);

  return (
    <MapContainer
      center={start}
      zoom={startZoom}
      maxZoom={MAX_ZOOM}
      maxBounds={REGION_BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom
      className="h-full w-full"
      zoomControl={false}
    >
      {layers.satellite ? (
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      ) : (
        <>
          <TileLayer key={tileBase} attribution={ESRI_ATTRIBUTION} url={tileBase} maxNativeZoom={CANVAS_NATIVE_ZOOM} />
          <TileLayer key={tileLabels} url={tileLabels} maxNativeZoom={CANVAS_NATIVE_ZOOM} />
        </>
      )}

      {/* Statewide USGS context gauges — small, neutral, non-tiered. */}
      {layers.usgs &&
        usgs?.map((g) => (
          <CircleMarker
            key={`usgs-${g.id}`}
            center={[g.lat, g.lng]}
            radius={3}
            pathOptions={{
              color: usgsColor,
              weight: 1,
              fillColor: usgsColor,
              fillOpacity: 0.55,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              USGS · {g.name} · {g.levelFt.toFixed(1)} ft
            </Tooltip>
          </CircleMarker>
        ))}

      {/* Ripple pulses under the dots — the "tsunami" layer. */}
      {layers.ripples &&
        gauges.map((g) => {
          const icon = rippleIcons.get(g.id);
          if (!icon) return null;
          return (
            <Marker
              key={`ripple-${g.id}`}
              position={[g.lat, g.lng]}
              icon={icon}
              interactive={false}
            />
          );
        })}

      {layers.dots &&
        gauges.map((g) => {
          const isSel = selectedId === `g${g.id}`;
          return (
            <CircleMarker
              key={g.id}
              center={[g.lat, g.lng]}
              radius={isSel ? 9 : 6}
              pathOptions={{
                color: isSel ? selectedStroke : strokeColor,
                weight: isSel ? 2.5 : 1.5,
                fillColor: TIER_COLOR[g.tier],
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () =>
                  onSelect?.({ id: `g${g.id}`, kind: 'gauge', gauge: g }),
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                Gauge {g.id} · {g.tier}
              </Tooltip>
            </CircleMarker>
          );
        })}

      {center && (
        <Marker
          position={[center.lat, center.lng]}
          icon={addressIcon}
          eventHandlers={{
            click: () => onSelect?.({ id: 'address', kind: 'address' }),
          }}
        >
          <Tooltip direction="top" offset={[0, -30]}>
            {address ?? 'Your address'}
          </Tooltip>
        </Marker>
      )}

      {layers.wind && <WindLayer color={windColor} />}

      {/* Above the tiles, below the gauges: paper over everything outside Texas. */}
      <Pane name="not-texas" style={{ zIndex: 350 }}>
        <TexasMask fill={maskColor} />
        <Polygon
          positions={TEXAS_LINES}
          interactive={false}
          pathOptions={{ color: borderColor, weight: 1.2, fill: false }}
        />
      </Pane>

      <ClampToRegion fitOnStart={!initialView && !(zoomToCenter && center)} />
      <ReadyProbe onReady={onReady} />
      <FocusGauge gauge={focusGauge} />
      <Recenter
        center={center ? [center.lat, center.lng] : null}
        zoomToCenter={zoomToCenter}
      />
    </MapContainer>
  );
}
