/* Reverse geocoding for "Locate me". Server-side so the provider can change
 * without touching the client. */

import { NextResponse } from 'next/server';
import { reverseGeocode } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const lat = Number(q.get('lat'));
  const lng = Number(q.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }
  return NextResponse.json({ label: await reverseGeocode(lat, lng) });
}
