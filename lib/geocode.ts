/* Address -> lat/lng. Provider-swappable.
 * Default: free US Census geocoder (no key, US-only, good for Houston).
 * Set NEXT_PUBLIC_MAPBOX_TOKEN to auto-switch to Mapbox (better coverage). */

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string; // normalized/matched address
}

export async function geocode(address: string): Promise<GeoPoint | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token) return geocodeMapbox(address, token);
  return geocodeCensus(address);
}

async function geocodeCensus(address: string): Promise<GeoPoint | null> {
  const url =
    'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress' +
    `?address=${encodeURIComponent(address)}` +
    '&benchmark=Public_AR_Current&format=json';

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const match = data?.result?.addressMatches?.[0];
    if (!match) return null;
    // Census returns x=lng, y=lat.
    return {
      lat: match.coordinates.y,
      lng: match.coordinates.x,
      label: match.matchedAddress,
    };
  } catch {
    return null;
  }
}

async function geocodeMapbox(
  address: string,
  token: string,
): Promise<GeoPoint | null> {
  const url =
    'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
    `${encodeURIComponent(address)}.json` +
    `?access_token=${token}&limit=1&country=us`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.center;
    return { lat, lng, label: feature.place_name };
  } catch {
    return null;
  }
}
