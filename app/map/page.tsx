import type { Metadata } from 'next';
import HomeExperience from '@/components/HomeExperience';
import { demoView, getFloodView } from '@/lib/api';

export function generateMetadata({ searchParams }: { searchParams: { address?: string } }): Metadata {
  const address = searchParams.address?.trim().slice(0, 120);
  if (!address) return { title: 'Map — BayouGuard' };
  const title = `Flood risk at ${address} — BayouGuard`;
  const image = `/api/og?address=${encodeURIComponent(address)}`;
  return {
    title,
    description: 'Live Harris County gauges, an ML flood-risk score, and whether it’s safe to drive.',
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [image] },
  };
}

// A sleeping Render backend takes ~1 min to wake. The server render never
// waits more than this; the client fetches the live view after hydration.
const SSR_BUDGET_MS = 4000;

export default async function MapPage({
  searchParams,
}: {
  searchParams: { address?: string; lat?: string; lng?: string };
}) {
  const address = searchParams.address?.trim().slice(0, 200) || undefined;
  // The landing geocodes before it zooms; reuse its coordinates so the map
  // opens exactly where the dots flew.
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);
  const coords =
    address && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng }
      : undefined;

  const initial = await Promise.race([
    getFloodView(address, coords, { timeoutMs: SSR_BUDGET_MS - 500 }),
    new Promise<ReturnType<typeof demoView>>((resolve) =>
      setTimeout(() => resolve(demoView(coords ?? null, address ?? null, true)), SSR_BUDGET_MS),
    ),
  ]);

  return (
    <main className="h-full">
      <HomeExperience initial={initial} initialAddress={address} initialCoords={coords} />
    </main>
  );
}
