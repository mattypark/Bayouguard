'use client';

/* Interactive Leaflet map. OSM tiles (free, no key) — swap the TileLayer url to
 * Google/Mapbox later. Plots every flood gauge colored by risk tier plus a pin
 * at the searched address. Loaded client-only (Leaflet touches window). */

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GaugePoint, Tier } from '@/lib/types';

const TIER_COLOR: Record<Tier, string> = {
  LOW: '#1B5E20',
  MEDIUM: '#E65100',
  HIGH: '#B71C1C',
  CRITICAL: '#4A148C',
};

const HOUSTON: [number, number] = [29.7604, -95.3698];

// Teardrop pin for the searched address, built as a DivIcon so we ship no image assets.
const addressIcon = L.divIcon({
  className: '',
  html:
    '<div style="position:relative;width:26px;height:34px;">' +
    '<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 0C5.8 0 0 5.8 0 13c0 9 13 21 13 21s13-12 13-21C26 5.8 20.2 0 13 0z" fill="#1A4480"/>' +
    '<circle cx="13" cy="13" r="5" fill="#fff"/></svg></div>',
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -32],
});

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 1.1 });
  }, [center, map]);
  return null;
}

export default function FloodMap({
  center,
  gauges,
  address,
}: {
  center: { lat: number; lng: number } | null;
  gauges: GaugePoint[];
  address?: string;
}) {
  const start: [number, number] = center ? [center.lat, center.lng] : HOUSTON;

  return (
    <MapContainer
      center={start}
      zoom={center ? 13 : 9}
      scrollWheelZoom
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {gauges.map((g) => (
        <CircleMarker
          key={g.id}
          center={[g.lat, g.lng]}
          radius={6}
          pathOptions={{
            color: '#ffffff',
            weight: 1.5,
            fillColor: TIER_COLOR[g.tier],
            fillOpacity: 0.9,
          }}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            Gauge {g.id} · {g.tier}
          </Tooltip>
          <Popup>
            <strong>Gauge {g.id}</strong>
            <br />
            Risk: {g.tier}
            <br />
            Level: {g.current} ft / floods at {g.flood} ft
            <br />
            Buffer: {g.buffer} ft
          </Popup>
        </CircleMarker>
      ))}

      {center && (
        <Marker position={[center.lat, center.lng]} icon={addressIcon}>
          <Popup>{address ?? 'Your address'}</Popup>
        </Marker>
      )}

      <Recenter center={center ? [center.lat, center.lng] : null} />
    </MapContainer>
  );
}
