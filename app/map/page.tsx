import type { Metadata } from 'next';
import HomeExperience from '@/components/HomeExperience';
import { getFloodView } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Map — BayouGuard',
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: { address?: string };
}) {
  const address = searchParams.address?.trim().slice(0, 200) || undefined;
  const initial = await getFloodView(address);

  return (
    <main className="h-full">
      <HomeExperience initial={initial} initialAddress={address} />
    </main>
  );
}
