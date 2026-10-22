/* Hourly risk for the next six hours. PLANNED backend endpoint; demo until then. */

import { NextResponse } from 'next/server';
import { getForecast } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const lat = Number(q.get('lat'));
  const lng = Number(q.get('lng'));
  const score = Number(q.get('score'));
  const level = q.get('level');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }
  const result = await getForecast(lat, lng, {
    score: Number.isFinite(score) ? score : 20,
    level: level === 'WARNING' || level === 'WATCH' ? level : 'CLEAR',
  });
  return NextResponse.json(result);
}
