'use client';

/* Interactive Leaflet map of the Houston-area sensor network, and only that:
 * panning is clamped to the region the gauges cover, and minZoom is computed
 * from it so even ultrawide windows can't zoom out past it. Zoom stops where
 * the basemap's tiles stop (16), and the street labels fade out while zooming
 * so old and new labels never stack up. Composable layers controlled by the
 * LayerControl checkboxes: risk-tier gauge dots, ripples on dangerous gauges,
 * wind flow, satellite imagery, shelters, roads, reports and reservoirs.
 * Loaded client-only (Leaflet touches window). */

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Pane,
  Polyline,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GaugePoint, Tier } from '@/lib/types';
import { TIER_HEX, OB, BASEMAP, type Mode } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import type { MapLayers } from './LayerControl';
import type { CommunityReport, Reservoir, RoadCollection, Shelter } from '@/lib/contract';
import { RESERVOIR_POINTS } from './inspector/ReservoirCard';

export interface MapOverlays {
  shelters?: Shelter[] | null;
  roads?: RoadCollection | null;
  reports?: CommunityReport[] | null;
  reservoirs?: Reservoir[] | null;
}

function makeShelterIcon(fill: string, status: Shelter['status']) {
  const opacity = status === 'closed' ? 0.55 : 1;
  return L.divIcon({
    className: '',
    html:
      `<div style="width:26px;height:26px;border-radius:6px;background:${fill};opacity:${opacity};` +
      'display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 4px rgba(26,26,46,.3)">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 20 12 4l9 16H3z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M9.5 20 12 14l2.5 6" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function makeReportIcon(fill: string) {
  return L.divIcon({
    className: '',
    html:
      '<svg width="20" height="26" viewBox="0 0 26 34" style="filter:drop-shadow(0 1px 2px rgba(26,26,46,.35))">' +
      `<path d="M13 0C5.8 0 0 5.8 0 13c0 9 13 21 13 21s13-12 13-21C26 5.8 20.2 0 13 0z" fill="${fill}" stroke="#fff" stroke-width="2"/>` +
      '<path d="M7 15c2-2 4-2 6 0s4 2 6 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
    iconSize: [20, 26],
    iconAnchor: [10, 26],
  });
}

function makeReservoirIcon(fill: string, letter: string) {
  return L.divIcon({
    className: '',
    html:
      `<div style="width:24px;height:24px;border-radius:4px;background:${fill};color:#fff;font:700 12px/24px var(--font-inter),sans-serif;` +
      `text-align:center;border:2px solid #fff;box-shadow:0 2px 4px rgba(26,26,46,.3)">${letter}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
import WindLayer from './WindLayer';

export interface MapSelection {
  id: string;
  kind: 'gauge' | 'address';
  gauge?: GaugePoint;
}

const HOUSTON: [number, number] = [29.7604, -95.3698];

// Every gauge in the network (29.31-30.69 N, 96.09-94.84 W) with a margin:
// BayouGuard covers greater Houston, so the map does too.
const REGION_BOUNDS: [[number, number], [number, number]] = [
  [29.05, -96.4], // SW
  [30.9, -94.55], // NE
];
// The grey canvas basemap has tiles to 16. Past that Leaflet stretches them
// and the labels turn into blurred giants, so the map stops here.
const MAX_ZOOM = 16;
const CANVAS_NATIVE_ZOOM = MAX_ZOOM;

// Regional zoom shows the whole network; street zoom is reserved for an
// explicit address search.
const REGION_ZOOM = 9;
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
// assets. Water-coloured (it marks where you are relative to the water), with
// a hole in the surface colour.
function makeAddressIcon(accent: string, hole: string) {
  return L.divIcon({
    className: '',
    html:
      '<div style="position:relative;width:26px;height:34px;filter:drop-shadow(0 2px 3px rgba(26,26,46,0.35));">' +
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

function makeRippleIcon(tier: Tier, color: string) {
  const size = RIPPLE_SIZE[tier];
  // Random negative delay desynchronizes the pulses across gauges.
  const delay = `-${(Math.random() * 4).toFixed(2)}s`;
  return L.divIcon({
    className: '',
    html:
      `<div class="gauge-ripple" style="position:absolute;inset:0;` +
      `--ripple-color:${color};--ripple-duration:${RIPPLE_DURATION[tier]};` +
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

/* Street labels live in their own pane and fade out for the length of a
 * zoom, coming back once the new zoom's labels have loaded. Otherwise Leaflet
 * shows the old zoom's labels stretched and blurry on top of the new ones. */
function LabelFade() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    let timer = 0;
    const show = () => {
      window.clearTimeout(timer);
      el.classList.remove('labels-hidden');
    };
    const hide = () => {
      window.clearTimeout(timer);
      el.classList.add('labels-hidden');
    };
    const settle = () => {
      let labels: L.TileLayer | null = null;
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer && layer.options.pane === 'labels') labels = layer;
      });
      // Show on the labels' load event, or after a beat if it never comes (cached tiles).
      timer = window.setTimeout(show, 900);
      if (labels) (labels as L.TileLayer).once('load', show);
      else show();
    };
    map.on('zoomstart', hide);
    map.on('zoomend', settle);
    return () => {
      window.clearTimeout(timer);
      map.off('zoomstart', hide);
      map.off('zoomend', settle);
    };
  }, [map]);
  return null;
}

function MapHandle({ onMap }: { onMap?: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap?.(map);
  }, [map, onMap]);
  return null;
}

/* Fly to the searched address so the pin lands in the part of the map the
 * inspector doesn't cover (`inset` = px hidden on the right and bottom). */
function Recenter({
  center,
  zoomToCenter,
  inset,
}: {
  center: [number, number] | null;
  zoomToCenter: boolean;
  inset: { right: number; bottom: number };
}) {
  const map = useMap();
  const lat = center?.[0];
  const lng = center?.[1];
  useEffect(() => {
    if (lat == null || lng == null || !zoomToCenter) return;
    const target = map.project([lat, lng], ADDRESS_ZOOM).add([inset.right / 2, inset.bottom / 2]);
    map.flyTo(map.unproject(target, ADDRESS_ZOOM), ADDRESS_ZOOM, { duration: 1.1 });
  }, [lat, lng, zoomToCenter, inset.right, inset.bottom, map]);
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
  overlays = {},
  onMap,
  inset = { right: 0, bottom: 0 },
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
  overlays?: MapOverlays;
  /** The Leaflet map, once created (for the map-centre report location). */
  onMap?: (map: L.Map) => void;
  /** Pixels covered by the inspector, so the address pin isn't hidden under it. */
  inset?: { right: number; bottom: number };
}) {
  const { t } = useI18n();
  const yourAddress = t('map.yourAddress');
  const start: [number, number] = center ? [center.lat, center.lng] : HOUSTON;
  const startZoom = zoomToCenter && center ? ADDRESS_ZOOM : REGION_ZOOM;
  const tok = OB[mode];
  const tierHex = TIER_HEX[mode];
  const { base: tileBase, labels: tileLabels } = BASEMAP[mode];
  // A white keyline lifts the tier fill off grey tiles; ink marks the selection.
  const strokeColor = mode === 'light' ? '#ffffff' : tok.bg;
  const selectedStroke = tok.text;
  const windColor = mode === 'light' ? 'rgba(26,68,128,0.55)' : 'rgba(157,190,255,0.8)';
  const addressIcon = useMemo(() => makeAddressIcon(tok.water, tok.surface), [tok]);
  const shelterIcons = useMemo(
    () => ({
      open: makeShelterIcon(tok.accent, 'open'),
      full: makeShelterIcon(tok.accent, 'full'),
      closed: makeShelterIcon(tok.muted, 'closed'),
    }),
    [tok],
  );
  const reportIcon = useMemo(() => makeReportIcon(tok.accent), [tok]);
  const reservoirIcons = useMemo(
    () => new Map(RESERVOIR_POINTS.map((p) => [p.name, makeReservoirIcon(tok.water, p.name[0])])),
    [tok],
  );
  // Per-gauge icons (not per-tier) so every gauge pulses on its own phase;
  // memoized on the gauge list so selection clicks don't restart animations.
  // Ripples only where the water is dangerous: a pulse means "look here",
  // and a few dozen animated markers stay cheap where 338 did not.
  const rippling = useMemo(() => gauges.filter((g) => g.tier === 'HIGH' || g.tier === 'CRITICAL'), [gauges]);
  const rippleIcons = useMemo(
    () => new Map(rippling.map((g) => [g.id, makeRippleIcon(g.tier, tierHex[g.tier])])),
    [rippling, tierHex],
  );

  return (
    <MapContainer
      center={start}
      zoom={startZoom}
      maxZoom={MAX_ZOOM}
      maxBounds={REGION_BOUNDS}
      maxBoundsViscosity={1}
      // One canvas for the gauge dots, roads and mask instead of hundreds of
      // SVG nodes: the difference between smooth and stuttering on old phones.
      preferCanvas
      scrollWheelZoom
      className="h-full w-full"
      zoomControl={false}
    >
      {layers.satellite ? (
        <TileLayer
          attribution={BASEMAP.satelliteAttribution}
          url={BASEMAP.satellite}
        />
      ) : (
        <>
          <TileLayer key={tileBase} className="tiles-base" attribution={BASEMAP.attribution} url={tileBase} maxNativeZoom={CANVAS_NATIVE_ZOOM} />
          <Pane name="labels" style={{ zIndex: 250 }} className="leaflet-labels-pane">
            <TileLayer key={tileLabels} pane="labels" url={tileLabels} maxNativeZoom={CANVAS_NATIVE_ZOOM} />
          </Pane>
        </>
      )}

      {/* Ripple pulses under the dots — the "tsunami" layer. */}
      {layers.ripples &&
        rippling.map((g) => {
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
                fillColor: tierHex[g.tier],
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () =>
                  onSelect?.({ id: `g${g.id}`, kind: 'gauge', gauge: g }),
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {g.name} · {t(`tier.${g.tier}`)}
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
            {address ?? yourAddress}
          </Tooltip>
        </Marker>
      )}

      {layers.roads &&
        overlays.roads?.features.map((f, i) => (
          <Polyline
            key={`road-${i}`}
            positions={f.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])}
            pathOptions={{ color: tierHex.HIGH, weight: 5, dashArray: '8 6', lineCap: 'butt' }}
          >
            <Tooltip direction="top" sticky>
              {f.properties.name} · {t(f.properties.status === 'closed' ? 'road.closed' : 'road.flooded')}
            </Tooltip>
          </Polyline>
        ))}

      {layers.shelters &&
        overlays.shelters?.map((s) => (
          <Marker key={`shelter-${s.id}`} position={[s.lat, s.lng]} icon={shelterIcons[s.status]}>
            <Tooltip direction="top" offset={[0, -12]}>
              {s.name} · {t(`shelter.status.${s.status}`)}
            </Tooltip>
          </Marker>
        ))}

      {layers.reservoirs &&
        RESERVOIR_POINTS.map((p) => {
          const r = overlays.reservoirs?.find((x) => x.name === p.name);
          return (
            <Marker key={`res-${p.name}`} position={[p.lat, p.lng]} icon={reservoirIcons.get(p.name)!}>
              <Tooltip direction="top" offset={[0, -12]}>
                {t('res.name', { name: p.name })}
                {r ? ` · ${r.poolElevationFt.toFixed(1)} ft` : ''}
              </Tooltip>
            </Marker>
          );
        })}

      {layers.reports &&
        overlays.reports?.map((r, i) => (
          <Marker key={r.id ?? `report-${i}`} position={[r.lat, r.lng]} icon={reportIcon}>
            <Tooltip direction="top" offset={[0, -24]}>
              {t(`report.${r.severity}`)}
              {r.note ? ` · ${r.note}` : ''}
            </Tooltip>
          </Marker>
        ))}

      {layers.wind && <WindLayer color={windColor} />}

      <ClampToRegion fitOnStart={!(zoomToCenter && center)} />
      <MapHandle onMap={onMap} />
      <LabelFade />
      <FocusGauge gauge={focusGauge} />
      <Recenter
        center={center ? [center.lat, center.lng] : null}
        zoomToCenter={zoomToCenter}
        inset={inset}
      />
    </MapContainer>
  );
}
