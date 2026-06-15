'use client';

import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/',         label: 'Home',     icon: '🏠' },
  { href: '/map',      label: 'Map',      icon: '🗺' },
  { href: '/shelters', label: 'Shelters', icon: '🏚' },
  { href: '/alerts',   label: 'Alerts',   icon: '🔔' },
];

export default function BottomTabs() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-cs-border bg-white md:hidden">
      <ul className="mx-auto grid max-w-6xl grid-cols-4">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <li key={t.href}>
              <a
                href={t.href}
                className={`flex h-14 min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] ${
                  active ? 'text-cs-teal' : 'text-cs-steel'
                }`}
              >
                <span className="text-base" aria-hidden>{t.icon}</span>
                <span className="font-medium">{t.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
