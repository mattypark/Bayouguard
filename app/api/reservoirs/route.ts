/* Addicks and Barker. PLANNED backend endpoint; HCFWS dam gauges until then. */

import { NextResponse } from 'next/server';
import { getReservoirs } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getReservoirs());
}
