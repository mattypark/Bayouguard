'use client';

import { useState } from 'react';

const langs = ['EN', 'ES', 'VI'] as const;

export default function NavBar() {
  const [lang, setLang] = useState<(typeof langs)[number]>('EN');

  return (
    <header className="sticky top-0 z-40 bg-cs-navy text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16 md:px-6">
        <a href="/" className="flex items-center gap-2">
          <span className="font-serif text-[22px] leading-none">BayouGuard</span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a className="opacity-80 hover:opacity-100" href="/">Home</a>
          <a className="opacity-80 hover:opacity-100" href="/map">Map</a>
          <a className="opacity-80 hover:opacity-100" href="/shelters">Shelters</a>
          <a className="opacity-80 hover:opacity-100" href="/alerts">Alerts</a>
          <a className="opacity-80 hover:opacity-100" href="/about">About</a>
        </nav>

        <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={[
                'min-h-[32px] min-w-[36px] rounded-full px-2 text-xs font-semibold transition',
                lang === l ? 'bg-white text-cs-navy' : 'text-white/70 hover:text-white',
              ].join(' ')}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
