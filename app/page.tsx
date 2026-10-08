import Landing, { type LandingVariant } from '@/components/landing/Landing';
import { getLandingData } from '@/lib/landing';

export const revalidate = 60;

function formatFreshness(iso: string | null): string {
  if (!iso) return 'Gauges read every 5 minutes';
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }).format(new Date(iso));
  return `Gauges read every 5 minutes · newest reading ${time} CT`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: { v?: string };
}) {
  const data = await getLandingData();
  // A/B: ?v=b shows the Texas dot-matrix; anything else is the globe.
  const variant: LandingVariant = searchParams.v === 'b' ? 'b' : 'a';

  return (
    <Landing
      data={data}
      freshness={formatFreshness(data.latestReading)}
      variant={variant}
      showVariantSwitch={process.env.NODE_ENV === 'development'}
    />
  );
}
