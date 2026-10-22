import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CheckView from '@/components/pages/CheckView';
import { demoView, getFloodView } from '@/lib/api';

type Params = { address?: string; lat?: string; lng?: string };

export function generateMetadata({ searchParams }: { searchParams: Params }): Metadata {
  const address = searchParams.address?.trim().slice(0, 120);
  if (!address) return { title: 'BayouGuard' };
  const title = `Flood risk at ${address} — BayouGuard`;
  const image = `/api/og?address=${encodeURIComponent(address)}`;
  return {
    title,
    description: 'Is it safe to drive? Live Harris County water sensors and an ML flood-risk score.',
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [image] },
  };
}

// Same budget as the map: never hold the page for a sleeping backend.
const SSR_BUDGET_MS = 4000;

export default async function CheckPage({ searchParams }: { searchParams: Params }) {
  const address = searchParams.address?.trim().slice(0, 200);
  if (!address) redirect('/');
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);
  const coords = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined;

  const initial = await Promise.race([
    getFloodView(address, coords, { timeoutMs: SSR_BUDGET_MS - 500, lite: true }),
    new Promise<ReturnType<typeof demoView>>((resolve) =>
      setTimeout(() => resolve({ ...demoView(coords ?? null, address, true), gauges: [] }), SSR_BUDGET_MS),
    ),
  ]);

  return <CheckView key={`${address}|${lat}|${lng}`} initial={initial} address={address} coords={coords} />;
}
