'use client';

/* Interactive Leaflet map. Clamped to Texas plus its neighbors (enough margin
 * to see what's coming, never the whole world — minZoom is computed from the
 * bounds so even ultrawide windows can't zoom past the region). Composable
 * layers controlled by the LayerControl checkboxes: risk-tier gauge dots,
 * "tsunami" ripple pulses, animated wind flow, satellite imagery, and the
 * statewide USGS context network. Loaded client-only (Leaflet touches window). */

import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GaugePoint, Tier } from '@/lib/types';
import type { UsgsGauge } from '@/lib/usgs';
import { TIER_COLOR, OB, type Mode } from '@/lib/theme';
import type { MapLayers } from './LayerControl';
import WindLayer from './WindLayer';

export interface MapSelection {
  id: string;
  kind: 'gauge' | 'address';
  gauge?: GaugePoint;
}

const HOUSTON: [number, number] = [29.7604, -95.3698];

// Texas plus a margin of its neighbors (OK, NM, AR, LA, north Mexico, gulf) so
// incoming weather is visible, but the map can never show the whole country.
const REGION_BOUNDS: [[number, number], [number, number]] = [
  [24.2, -108.5], // SW
  [38.2, -88.0], // NE
];
const MAX_ZOOM = 18;
const ESRI_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
// The grey canvas has tiles to 16; past that Leaflet upscales them.
const CANVAS_NATIVE_ZOOM = 16;
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
function ClampToRegion() {
  const map = useMap();
  useEffect(() => {
    const apply = () => {
      const z = map.getBoundsZoom(REGION_BOUNDS, true);
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
}) {
  const start: [number, number] = center ? [center.lat, center.lng] : HOUSTON;
  const startZoom = zoomToCenter && center ? ADDRESS_ZOOM : REGION_ZOOM;
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

      <ClampToRegion />
      <FocusGauge gauge={focusGauge} />
      <Recenter
        center={center ? [center.lat, center.lng] : null}
        zoomToCenter={zoomToCenter}
      />
    </MapContainer>
  );
}
