/* Server route for statewide USGS gauges. The upstream response is ~1.2 MB;
 * this trims it to the fields the map needs and shares one cached fetch. */

import { NextResponse } from 'next/server';
import { getUsgsGauges } from '@/lib/usgs';

export async function GET() {
  const gauges = await getUsgsGauges();
  return NextResponse.json({ gauges });
}
