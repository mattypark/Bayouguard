/* Browser-side fetch for flood data + address suggestions. Calls our own API
 * routes so geocode/backend/weather calls stay server-side (no third-party CORS). */

import type { FloodView } from './types';
import type { Suggestion } from './geocode';

export async function fetchFloodView(
  address: string,
  coords?: { lat: number; lng: number },
): Promise<FloodView> {
  const params = new URLSearchParams({ address });
  if (coords) {
    params.set('lat', String(coords.lat));
    params.set('lng', String(coords.lng));
  }
  const res = await fetch(`/api/flood?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Flood lookup failed: ${res.status}`);
  return (await res.json()) as FloodView;
}

export async function fetchSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
    cache: 'no-store',
    signal,
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.suggestions) ? (data.suggestions as Suggestion[]) : [];
}
