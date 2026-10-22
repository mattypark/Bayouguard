/* Community flood reports. PLANNED backend endpoint. In demo mode GET returns
 * sample pins and POST stores nothing — the client keeps the pin locally and
 * says it isn't shared. */

import { NextResponse } from 'next/server';
import { getReports, postReport } from '@/lib/endpoints';
import type { CommunityReport, ReportSeverity } from '@/lib/contract';

export const dynamic = 'force-dynamic';

const SEVERITIES: ReportSeverity[] = ['water_on_road', 'passable', 'impassable'];
const LIFETIME_MS = 3 * 3600_000;

export async function GET() {
  return NextResponse.json(await getReports());
}

export async function POST(request: Request) {
  let body: Partial<CommunityReport>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { lat, lng, severity } = body;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !SEVERITIES.includes(severity as ReportSeverity)) {
    return NextResponse.json({ error: 'lat, lng and a valid severity are required' }, { status: 400 });
  }
  const now = Date.now();
  const report: CommunityReport = {
    lat,
    lng,
    severity: severity as ReportSeverity,
    note: typeof body.note === 'string' ? body.note.slice(0, 140) : undefined,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + LIFETIME_MS).toISOString(),
  };
  const ok = await postReport(report);
  return NextResponse.json({ ok, source: ok ? 'live' : 'demo', report });
}
