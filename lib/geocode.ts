/* Address -> lat/lng. Provider-swappable.
 * Default: free US Census geocoder (no key, US-only, good for Houston).
 * Set NEXT_PUBLIC_MAPBOX_TOKEN to auto-switch to Mapbox (better coverage). */

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string; // normalized/matched address
}

export interface Suggestion {
  label: string;
  lat: number;
  lng: number;
}

// Houston bias for type-ahead ranking.
const HOUSTON = { lat: 29.7604, lng: -95.3698 };
// Greater Houston / SE Texas bounding box (minLon, minLat, maxLon, maxLat).
// Constrains suggestions to the service area so out-of-region hits drop out.
const HOUSTON_BBOX = '-96.4,28.9,-94.4,30.6';

/* Type-ahead suggestions. Photon (komoot) — free, no key, built for autocomplete.
 * Biased toward Houston. Swap provider here later (Mapbox/Google) without
 * touching callers. */
export async function suggestAddresses(query: string): Promise<Suggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url =
    'https://photon.komoot.io/api/' +
    `?q=${encodeURIComponent(q)}` +
    `&lat=${HOUSTON.lat}&lon=${HOUSTON.lng}` +
    `&bbox=${HOUSTON_BBOX}` +
    '&limit=6&lang=en';

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    return features
      .map((f: unknown): Suggestion | null => {
        const feat = f as {
          geometry?: { coordinates?: [number, number] };
          properties?: Record<string, string>;
        };
        const coords = feat.geometry?.coordinates;
        if (!coords || coords.length < 2) return null;
        return {
          label: formatSuggestion(feat.properties ?? {}),
          lng: coords[0],
          lat: coords[1],
        };
      })
      .filter((s: Suggestion | null): s is Suggestion => s !== null);
  } catch {
    return [];
  }
}

function formatSuggestion(p: Record<string, string>): string {
  const line1 = [p.housenumber, p.street].filter(Boolean).join(' ') || p.name;
  const parts = [line1, p.city, p.state, p.postcode].filter(Boolean);
  return parts.join(', ');
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
