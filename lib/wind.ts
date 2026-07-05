/* Regional wind field for the map's animated flow layer.
 *
 * Samples Open-Meteo's current 10m wind on a coarse grid over Texas and its
 * neighbors. Meteorological direction is "coming FROM", so the u/v components
 * (toward east / toward north, m/s) are the negated unit vector — that's what
 * the particle layer advects along to show where weather is heading. */

export interface WindField {
  lats: number[]; // ascending
  lngs: number[]; // ascending
  u: number[][]; // [latIdx][lngIdx] eastward m/s
  v: number[][]; // [latIdx][lngIdx] northward m/s
  fetchedAt: string;
}

// Matches the map's clamped region (Texas + enough margin to see what's coming).
export const WIND_LATS = [24, 26.5, 29, 31.5, 34, 36.5, 39];
export const WIND_LNGS = [-108, -104.5, -101, -97.5, -94, -90.5, -87];

interface OpenMeteoPoint {
  latitude: number;
  longitude: number;
  current?: {
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
}

export async function getWindField(): Promise<WindField | null> {
  const pts: Array<{ lat: number; lng: number }> = [];
  for (const lat of WIND_LATS) {
    for (const lng of WIND_LNGS) {
      pts.push({ lat, lng });
    }
  }

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${pts.map((p) => p.lat).join(',')}` +
    `&longitude=${pts.map((p) => p.lng).join(',')}` +
    '&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms';

  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const data: OpenMeteoPoint[] = await res.json();
    if (!Array.isArray(data) || data.length !== pts.length) return null;

    const u: number[][] = [];
    const v: number[][] = [];
    for (let i = 0; i < WIND_LATS.length; i++) {
      const uRow: number[] = [];
      const vRow: number[] = [];
      for (let j = 0; j < WIND_LNGS.length; j++) {
        const cur = data[i * WIND_LNGS.length + j]?.current;
        const speed = cur?.wind_speed_10m ?? 0;
        const dirFrom = ((cur?.wind_direction_10m ?? 0) * Math.PI) / 180;
        uRow.push(-speed * Math.sin(dirFrom));
        vRow.push(-speed * Math.cos(dirFrom));
      }
      u.push(uRow);
      v.push(vRow);
    }

    return {
      lats: WIND_LATS,
      lngs: WIND_LNGS,
      u,
      v,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
