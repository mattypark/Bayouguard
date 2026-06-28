'use client';

/* Interactive Leaflet map. OSM tiles (free, no key) — swap the TileLayer url to
 * Google/Mapbox later. Plots every flood gauge colored by risk tier plus a pin
 * at the searched address. Loaded client-only (Leaflet touches window). */

import { useEffect, useMemo } from 'react';
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
import type { GaugePoint } from '@/lib/types';
import { TIER_COLOR, OB, type Mode } from '@/lib/theme';

export interface MapSelection {
  id: string;
  kind: 'gauge' | 'address';
  gauge?: GaugePoint;
}

const HOUSTON: [number, number] = [29.7604, -95.3698];

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

// Regional zoom shows the gauge cluster in statewide Texas context; street zoom
// is reserved for an explicit address search.
const REGION_ZOOM = 7;
const ADDRESS_ZOOM = 13;

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

export default function FloodMap({
  center,
  gauges,
  address,
  mode,
  zoomToCenter,
  selectedId,
  onSelect,
}: {
  center: { lat: number; lng: number } | null;
  gauges: GaugePoint[];
  address?: string;
  mode: Mode;
  zoomToCenter: boolean;
  selectedId?: string | null;
  onSelect?: (sel: MapSelection | null) => void;
}) {
  const start: [number, number] = center ? [center.lat, center.lng] : HOUSTON;
  const startZoom = zoomToCenter && center ? ADDRESS_ZOOM : REGION_ZOOM;
  const tileUrl =
    mode === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const strokeColor = mode === 'light' ? '#0a0c10' : '#ffffff';
  const addressIcon = useMemo(
    () =>
      mode === 'light'
        ? makeAddressIcon('#1482d2', '#f0f3f9')
        : makeAddressIcon(OB.accent, '#0a0c10'),
    [mode],
  );

  return (
    <MapContainer
      center={start}
      zoom={startZoom}
      scrollWheelZoom
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileUrl}
      />

      {gauges.map((g) => {
        const isSel = selectedId === `g${g.id}`;
        return (
          <CircleMarker
            key={g.id}
            center={[g.lat, g.lng]}
            radius={isSel ? 9 : 6}
            pathOptions={{
              color: isSel ? '#ffffff' : strokeColor,
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

      <Recenter
        center={center ? [center.lat, center.lng] : null}
        zoomToCenter={zoomToCenter}
      />
    </MapContainer>
  );
}
