/* Closed and flooded road segments as GeoJSON. PLANNED backend endpoint. */

import { NextResponse } from 'next/server';
import { getRoads } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getRoads());
}
