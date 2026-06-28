import HomeExperience from '@/components/HomeExperience';
import { getFloodView } from '@/lib/api';

export const revalidate = 60;

export default async function Home() {
  const initial = await getFloodView();

  return (
    <main className="h-full">
      <HomeExperience initial={initial} />
    </main>
  );
}
