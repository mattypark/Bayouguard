'use client';

/* Mobile navigation: a fixed 56px tab bar above the home indicator. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { NAV_ITEMS, isActive } from './navItems';

export default function BottomTabs() {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-[85] border-t border-ob-border bg-ob-surface lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid h-14 max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[0.75rem] font-medium transition-colors ${
                  active ? 'text-ob-accent' : 'text-ob-muted hover:text-ob-text'
                }`}
              >
                <Icon className="h-6 w-6" />
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
