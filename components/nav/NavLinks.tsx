'use client';

/* Desktop navigation: text links in the top bar. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { NAV_ITEMS, isActive } from './navItems';

export default function NavLinks({ className = '' }: { className?: string }) {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label={t('nav.label')} className={className}>
      <ul className="ob-panel ob-float flex h-11 items-center gap-0.5 rounded-full px-1">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = isActive(href, path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-9 items-center rounded-full px-3 text-[0.8125rem] font-semibold transition-colors ${
                  active ? 'bg-ob-accent text-ob-onaccent' : 'text-ob-muted hover:text-ob-text'
                }`}
              >
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
