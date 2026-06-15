/* Browser-side fetch for the flood view. Calls our own /api/flood route so the
 * geocode/backend/weather calls stay server-side (no third-party CORS issues). */

import type { FloodView } from './types';

export async function fetchFloodView(address: string): Promise<FloodView> {
  const res = await fetch(`/api/flood?address=${encodeURIComponent(address)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Flood lookup failed: ${res.status}`);
  return (await res.json()) as FloodView;
}
