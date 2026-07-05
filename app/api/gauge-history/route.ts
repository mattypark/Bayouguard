/* Server route for per-gauge water-level history. The HCFWS detail page needs
 * a Referer header and has no CORS, so the browser fetches this same-origin
 * endpoint instead. Cached ~5 min via the fetch revalidate in lib/history. */

import { NextResponse } from 'next/server';
import { getGaugeHistory } from '@/lib/history';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid gauge id' }, { status: 400 });
  }

  const history = await getGaugeHistory(id);
  if (!history) {
    return NextResponse.json({ error: 'No history available' }, { status: 404 });
  }
  return NextResponse.json(history);
}
