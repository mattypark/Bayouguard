import NavBar from '@/components/NavBar';
import HomeExperience from '@/components/HomeExperience';
import BottomTabs from '@/components/BottomTabs';
import WaveDivider from '@/components/WaveDivider';
import { getFloodView } from '@/lib/api';

export const revalidate = 60;

export default async function Home() {
  const initial = await getFloodView();

  return (
    <main className="relative min-h-screen overflow-hidden pb-20 md:pb-0">
      <NavBar />

      {/* Hero <-> full-screen flood map. Owns the transition. */}
      <HomeExperience initial={initial} />

      <WaveDivider />

      {/* Footer */}
      <footer className="relative bg-cs-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="font-serif text-2xl leading-none">BayouGuard</p>
              <p className="mt-2 max-w-md text-sm text-white/70">
                Built for the Congressional App Challenge 2026. Not a substitute for
                official alerts from Harris County or the National Weather Service.
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <li><a className="opacity-80 hover:opacity-100" href="/map">Live map</a></li>
              <li><a className="opacity-80 hover:opacity-100" href="/shelters">Shelters</a></li>
              <li><a className="opacity-80 hover:opacity-100" href="/alerts">Alerts</a></li>
              <li><a className="opacity-80 hover:opacity-100" href="/about">About</a></li>
            </ul>
          </div>
          <p className="mt-6 text-xs text-white/50">
            © 2026 BayouGuard · TX-07 · Submission October 26, 2026
          </p>
        </div>
      </footer>

      <BottomTabs />
    </main>
  );
}
