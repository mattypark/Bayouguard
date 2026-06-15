/* Address type-ahead suggestions. Runs server-side so the provider can be
 * swapped (Photon -> Mapbox/Google) without exposing keys or hitting CORS. */

import { NextResponse } from 'next/server';
import { suggestAddresses } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';

  const suggestions = await suggestAddresses(q);
  return NextResponse.json({ suggestions });
}
