/* Emergency shelters. PLANNED backend endpoint; labelled sample data until then. */

import { NextResponse } from 'next/server';
import { getShelters } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getShelters());
}
