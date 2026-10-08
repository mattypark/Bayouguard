import Landing from '@/components/landing/Landing';
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

export default async function Home() {
  const data = await getLandingData();
  return <Landing data={data} freshness={formatFreshness(data.latestReading)} />;
}
