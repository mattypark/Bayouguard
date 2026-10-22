/* Address -> lat/lng. Provider-swappable.
 * Default: free US Census geocoder (no key, US-only, good for street
 * addresses), then Photon for places Census can't match (neighborhoods,
 * landmarks). Set NEXT_PUBLIC_MAPBOX_TOKEN to auto-switch to Mapbox. */

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
// Greater Houston / SE Texas bounding box. Constrains suggestions to the
// service area, and gates /risk — the backend 500s far from Harris County.
export const HOUSTON_BOUNDS = { minLng: -96.4, minLat: 28.9, maxLng: -94.4, maxLat: 30.6 } as const;
const HOUSTON_BBOX = [
  HOUSTON_BOUNDS.minLng,
  HOUSTON_BOUNDS.minLat,
  HOUSTON_BOUNDS.maxLng,
  HOUSTON_BOUNDS.maxLat,
].join(',');
const TIMEOUT_MS = 6000;

export function inServiceArea(lat: number, lng: number): boolean {
  return (
    lat >= HOUSTON_BOUNDS.minLat &&
    lat <= HOUSTON_BOUNDS.maxLat &&
    lng >= HOUSTON_BOUNDS.minLng &&
    lng <= HOUSTON_BOUNDS.maxLng
  );
}

// Census needs a city to match a bare street address ("2100 Memorial").
function withCity(q: string): string {
  return /houston|,\s*tx\b|texas|\b7\d{4}\b/i.test(q) ? q : `${q}, Houston, TX`;
}

/* Type-ahead suggestions. Photon (komoot) — free, no key, built for autocomplete
 * and biased toward Houston. Photon misses partial house numbers ("2100
 * Memorial"), so an empty answer falls back to the Census geocoder's single
 * best match: the user always gets at least one suggestion when one exists. */
export async function suggestAddresses(query: string): Promise<Suggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const photon = await suggestPhoton(q);
  if (photon.length > 0) return photon;
  const census = await geocodeCensus(withCity(q));
  return census ? [{ label: census.label ?? q, lat: census.lat, lng: census.lng }] : [];
}

async function suggestPhoton(q: string): Promise<Suggestion[]> {
  const url =
    'https://photon.komoot.io/api/' +
    `?q=${encodeURIComponent(q)}` +
    `&lat=${HOUSTON.lat}&lon=${HOUSTON.lng}` +
    `&bbox=${HOUSTON_BBOX}` +
    '&limit=6&lang=en';

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
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

/* Coordinates -> a readable address, for "Locate me". Photon reverse;
 * null when it has nothing. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const props = data?.features?.[0]?.properties;
    return props ? formatSuggestion(props) || null : null;
  } catch {
    return null;
  }
}

export async function geocode(address: string): Promise<GeoPoint | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token) return geocodeMapbox(address, token);
  const census = await geocodeCensus(withCity(address));
  if (census) return census;
  // Neighborhoods and landmarks ("Meyerland") — Census only knows streets.
  const [hit] = await suggestPhoton(address);
  return hit ? { lat: hit.lat, lng: hit.lng, label: hit.label } : null;
}

/* Census answers in capitals: "2100 MEMORIAL DR, HOUSTON, TX, 77007". */
function prettyCensus(label: string): string {
  const parts = label.split(',').map((p) => p.trim());
  const zip = /^\d{5}(-\d{4})?$/.test(parts[parts.length - 1] ?? '') ? parts.pop() : undefined;
  const state = parts.length > 1 && /^[A-Z]{2}$/.test(parts[parts.length - 1]) ? parts.pop() : undefined;
  const words = parts.map((p) =>
    p.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()),
  );
  const tail = [state, zip].filter(Boolean).join(' ');
  return [...words, tail].filter(Boolean).join(', ');
}

async function geocodeCensus(address: string): Promise<GeoPoint | null> {
  const url =
    'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress' +
    `?address=${encodeURIComponent(address)}` +
    '&benchmark=Public_AR_Current&format=json';

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = await res.json();
    const match = data?.result?.addressMatches?.[0];
    if (!match) return null;
    // Census returns x=lng, y=lat.
    return {
      lat: match.coordinates.y,
      lng: match.coordinates.x,
      label: prettyCensus(match.matchedAddress),
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
