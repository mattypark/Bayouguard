/* Server route for the flood view. Runs the geocode + backend + weather calls
 * server-side, so the browser never hits the Census geocoder or the backend
 * directly (no CORS needed). `budget` caps how long the backend may take:
 * the client loops short calls while Render wakes rather than holding one
 * request open past the platform's function limit. */

import { NextResponse } from 'next/server';
import { getFloodView, WARM_TIMEOUT_MS } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BUDGET_MS = 25_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address')?.slice(0, 200) ?? undefined;
  const latRaw = searchParams.get('lat');
  const lngRaw = searchParams.get('lng');
  const budget = Number(searchParams.get('budget'));
  const lang = searchParams.get('lang') ?? undefined;
  const lite = searchParams.get('lite') === '1';

  const coords =
    latRaw && lngRaw
      ? { lat: Number(latRaw), lng: Number(lngRaw) }
      : undefined;
  const valid =
    coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
      ? coords
      : undefined;

  const timeoutMs = Number.isFinite(budget) && budget > 0
    ? Math.min(budget, MAX_BUDGET_MS)
    : WARM_TIMEOUT_MS;

  const view = await getFloodView(address, valid, { timeoutMs, lang, lite });
  return NextResponse.json(view);
}
