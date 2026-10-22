import HomeView from '@/components/pages/HomeView';
import { getGaugeView } from '@/lib/api';

// Rebuilt at most once a minute; the network line is a nicety, never a wait.
export const revalidate = 60;

async function networkLine(): Promise<{ total: number; near: number; live: boolean } | null> {
  const view = await Promise.race([
    getGaugeView(3000).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), 3500)),
  ]);
  if (!view || view.gaugeSource === 'demo') return null;
  const near = view.gauges.filter((g) => g.tier === 'HIGH' || g.tier === 'CRITICAL').length;
  return { total: view.gauges.length, near, live: view.dataSource === 'live' };
}

export default async function Home() {
  return <HomeView network={await networkLine()} />;
}
