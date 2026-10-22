/* Flood-insurance claims since 2015 for a ZIP. PLANNED backend endpoint;
 * OpenFEMA directly until then. 204 when there's nothing to say. */

import { NextResponse } from 'next/server';
import { getFloodHistory } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const zip = new URL(request.url).searchParams.get('zip') ?? '';
  const result = await getFloodHistory(zip);
  if (!result) return new NextResponse(null, { status: 204 });
  return NextResponse.json(result);
}
