/* Backend health. The backend has no /health yet; a good /gauges counts. */

import { NextResponse } from 'next/server';
import { getHealth } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await getHealth();
  return NextResponse.json(result, { status: result.healthy ? 200 : 503 });
}
