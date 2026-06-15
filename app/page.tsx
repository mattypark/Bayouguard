import NavBar from '@/components/NavBar';
import HeroPanel from '@/components/HeroPanel';
import TexasMap from '@/components/TexasMap';
import BottomTabs from '@/components/BottomTabs';
import WaveDivider from '@/components/WaveDivider';
import { getHomeSnapshot } from '@/lib/api';

export const revalidate = 60;

export default async function Home() {
  const snap = await getHomeSnapshot();

  return (
    <main className="relative min-h-screen overflow-hidden pb-20 md:pb-0">
      <NavBar />

      {/* HERO — Texas map background, big wordmark, one-liner, search */}
      <section className="relative">
        {/* Background Texas map. Decorative, very soft. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <TexasMap
            className="h-[120%] w-[110%] max-w-[1100px] opacity-70 md:opacity-80"
            showHoustonPin
          />
          {/* Soft top fade so map reads as background, not content */}
          <div className="absolute inset-0 bg-gradient-to-b from-cs-sky/85 via-cs-sky/30 to-cs-sky" />
        </div>

        {/* Foreground content */}
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-16 pb-24 text-center md:px-6 md:pt-24 md:pb-32">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cs-teal">
            Houston · TX-07 · Live
          </p>

          <h1 className="font-serif text-5xl leading-none text-cs-navy md:text-7xl">
            BayouGuard
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-cs-midnight/80 md:text-lg">
            Flood risk for your Houston address — before the water rises.
          </p>

          <HeroPanel initial={snap} />
        </div>
      </section>

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
