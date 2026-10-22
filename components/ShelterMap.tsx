'use client';

/* Half-height map of shelter pins for the /shelters page. Client-only. */

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shelter } from '@/lib/contract';
import { BASEMAP, OB } from '@/lib/theme';
import { useDocumentTheme } from '@/lib/useDocumentTheme';
import { useI18n } from '@/lib/i18n';

function pin(fill: string, faded: boolean) {
  return L.divIcon({
    className: '',
    html:
      `<div style="width:28px;height:28px;border-radius:6px;background:${fill};opacity:${faded ? 0.55 : 1};` +
      'display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 4px rgba(26,26,46,.3)">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 20 12 4l9 16H3z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M9.5 20 12 14l2.5 6" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function Fit({ shelters }: { shelters: Shelter[] }) {
  const map = useMap();
  useEffect(() => {
    if (shelters.length === 0) return;
    map.fitBounds(L.latLngBounds(shelters.map((s) => [s.lat, s.lng] as [number, number])), { padding: [32, 32], maxZoom: 13 });
  }, [map, shelters]);
  return null;
}

export default function ShelterMap({ shelters }: { shelters: Shelter[] }) {
  const mode = useDocumentTheme();
  const { t } = useI18n();
  const tok = OB[mode];
  const icons = useMemo(() => ({ on: pin(tok.accent, false), off: pin(tok.muted, true) }), [tok]);
  return (
    <MapContainer center={[29.76, -95.37]} zoom={10} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer key={BASEMAP[mode].base} className="tiles-base" attribution={BASEMAP.attribution} url={BASEMAP[mode].base} />
      <TileLayer key={BASEMAP[mode].labels} url={BASEMAP[mode].labels} />
      {shelters.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={s.status === 'closed' ? icons.off : icons.on}>
          <Tooltip direction="top" offset={[0, -14]}>
            {s.name} · {t(`shelter.status.${s.status}`)}
          </Tooltip>
        </Marker>
      ))}
      <Fit shelters={shelters} />
    </MapContainer>
  );
}
