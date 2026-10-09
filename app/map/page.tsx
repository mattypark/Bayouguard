import type { Metadata } from 'next';
import HomeExperience from '@/components/HomeExperience';
import { getFloodView } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Map — BayouGuard',
};

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
  const initial = await getFloodView(address, coords);

  return (
    <main className="h-full">
      <HomeExperience initial={initial} initialAddress={address} />
    </main>
  );
}
