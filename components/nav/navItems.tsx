/* The four destinations, shared by the desktop links and the mobile tab bar. */

import type { MsgKey } from '@/lib/i18n';

export interface NavItem {
  href: string;
  label: MsgKey;
  icon: (props: { className?: string }) => JSX.Element;
}

const stroke = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

/** Home covers the result screen too. */
export function isActive(href: string, path: string): boolean {
  if (href === '/') return path === '/' || path.startsWith('/check');
  return path === href || path.startsWith(`${href}/`);
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'nav.home',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4v-9.5z" {...stroke} />
      </svg>
    ),
  },
  {
    href: '/map',
    label: 'nav.map',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" {...stroke} />
        <path d="M9 4v13M15 6.5v13" {...stroke} />
      </svg>
    ),
  },
  {
    href: '/shelters',
    label: 'nav.shelters',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M3 20 12 4l9 16H3z" {...stroke} />
        <path d="M12 4v16M9.5 20 12 14l2.5 6" {...stroke} />
      </svg>
    ),
  },
  {
    href: '/alerts',
    label: 'nav.alerts',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M6 10a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10z" {...stroke} />
        <path d="M10 20a2 2 0 0 0 4 0" {...stroke} />
      </svg>
    ),
  },
  {
    href: '/about',
    label: 'nav.about',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <circle cx="12" cy="12" r="8.5" {...stroke} />
        <path d="M12 11v5M12 8v.01" {...stroke} />
      </svg>
    ),
  },
];
