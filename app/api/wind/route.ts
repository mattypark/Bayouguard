/* Server route for the regional wind field. Open-Meteo allows browser calls,
 * but proxying keeps the grid definition server-side and caches one shared
 * field (~15 min) for every visitor instead of 49 calls per client. */

import { NextResponse } from 'next/server';
import { getWindField } from '@/lib/wind';

export async function GET() {
  const field = await getWindField();
  if (!field) {
    return NextResponse.json({ error: 'Wind data unavailable' }, { status: 503 });
  }
  return NextResponse.json(field);
}
