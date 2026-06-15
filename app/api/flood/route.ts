/* Server route for the flood view. Runs the geocode + backend + weather calls
 * server-side, so the browser never hits the Census geocoder directly (it has
 * no CORS headers). The client fetches this same-origin endpoint instead. */

import { NextResponse } from 'next/server';
import { getFloodView } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') ?? undefined;

  const view = await getFloodView(address);
  return NextResponse.json(view);
}
