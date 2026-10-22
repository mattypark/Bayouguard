/* Browser-side fetch for flood data + address suggestions. Calls our own API
 * routes so geocode/backend/weather calls stay server-side (no third-party CORS). */

import type { FloodView } from './types';
import type { Suggestion } from './geocode';

/** First contact may hit a sleeping Render backend: allow it a full minute. */
export const COLD_START_MS = 70_000;
/** Once the backend has answered, a lookup that takes longer is a failure. */
export const WARM_MS = 15_000;
// Each server call stays under the platform's function limit; the client loops.
const SLICE_MS = 25_000;
// Geocoding, weather and HCFWS run alongside the backend call.
const SERVER_OVERHEAD_MS = 6_000;

export async function fetchFloodView(
  address: string | undefined,
  coords: { lat: number; lng: number } | undefined,
  budgetMs: number,
  lang: string,
  lite = false,
): Promise<FloodView> {
  const params = new URLSearchParams({ budget: String(budgetMs), lang });
  if (lite) params.set('lite', '1');
  if (address) params.set('address', address);
  if (coords) {
    params.set('lat', String(coords.lat));
    params.set('lng', String(coords.lng));
  }
  const res = await fetch(`/api/flood?${params.toString()}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(budgetMs + SERVER_OVERHEAD_MS),
  });
  if (!res.ok) throw new Error(`Flood lookup failed: ${res.status}`);
  const view = (await res.json()) as FloodView;
  return res.headers.get('X-BayouGuard-Offline') ? { ...view, offline: true, backendTimedOut: false } : view;
}

/* Keep asking until the backend answers or the deadline passes. Each round
 * returns quickly with whatever the server could assemble (HCFWS or demo
 * gauges, a nearest-gauge estimate), so the caller can show it meanwhile. */
export async function fetchUntilAwake(
  address: string | undefined,
  coords: { lat: number; lng: number } | undefined,
  deadline: number,
  lang: string,
  onInterim?: (view: FloodView) => void,
  lite = false,
): Promise<FloodView> {
  let last: FloodView | null = null;
  for (;;) {
    const remaining = deadline - Date.now();
    const budget = Math.max(3_000, Math.min(SLICE_MS, remaining));
    try {
      const view = await fetchFloodView(address, coords, budget, lang, lite);
      if (!view.backendTimedOut || Date.now() >= deadline) return view;
      last = view;
      onInterim?.(view);
    } catch (err) {
      if (Date.now() >= deadline) {
        if (last) return last;
        throw err;
      }
      // The route itself timed out or the network blinked; try again shortly.
      await new Promise((r) => setTimeout(r, 1_500));
    }
  }
}

/** Fire-and-forget: start Render waking while the visitor is still typing. */
export function warmBackend(): void {
  fetch('/api/keepalive', { cache: 'no-store' }).catch(() => {});
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
