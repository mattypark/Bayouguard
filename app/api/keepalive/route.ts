/* Wakes the Render backend (free tier sleeps after 15 idle minutes) and
 * reports how long it took. The map pings it on mount so the server is
 * waking while the visitor types; an uptime monitor can hit it every 10 min
 * to keep it awake through recording and judging (see README). */

import { NextResponse } from 'next/server';
import { BASE, HAS_BACKEND } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  if (!HAS_BACKEND) {
    return NextResponse.json({ ok: false, ms: 0, error: 'backend not configured' }, { status: 503 });
  }
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}/gauges`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(58_000),
    });
    // Drain so the connection closes cleanly; the body itself isn't needed.
    await res.arrayBuffer();
    return NextResponse.json(
      { ok: res.ok, ms: Date.now() - started, status: res.status },
      { status: res.ok ? 200 : 502, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, ms: Date.now() - started },
      { status: 504, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
