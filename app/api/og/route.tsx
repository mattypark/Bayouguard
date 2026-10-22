/* Open Graph card for a shared /map?address= link: the brand and the
 * address. No score — a link preview shouldn't wait on a sleeping backend,
 * and a stale number in a preview could mislead. */

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address')?.slice(0, 120) || 'Houston, TX';
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F0F5FF',
          padding: '72px',
          color: '#1A1A2E',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: '#1A4480' }}>BayouGuard</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, color: '#4A6FA5' }}>Flood risk right now at</div>
          <div style={{ fontSize: 56, fontWeight: 700, marginTop: 12, lineHeight: 1.15 }}>{address}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: '#4A6FA5' }}>
          <span>Live Harris County gauges · ML risk score · Is it safe to drive?</span>
          <span style={{ color: '#00939A', fontWeight: 700 }}>bayouguard.vercel.app</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
