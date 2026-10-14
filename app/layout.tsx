import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import ServiceWorker from '@/components/ServiceWorker';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

// The wordmark only.
const display = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  preload: false,
});

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  // Link previews must point at the site that's actually serving them:
  // Vercel tells each deployment its own production domain.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : 'https://bayouguard.vercel.app'),
  ),
  title: 'BayouGuard — Texas floodwater, mapped',
  openGraph: { images: [{ url: '/api/og', width: 1200, height: 630 }] },
  appleWebApp: { capable: true, title: 'BayouGuard', statusBarStyle: 'default' },
  description:
    'Live water levels from every river and bayou gauge in Texas, and what they mean for your address. Built for the Congressional App Challenge 2026.',
};

export const viewport: Viewport = {
  themeColor: '#F0F5FF',
  width: 'device-width',
  initialScale: 1,
};

// Set the saved theme on <html> before first paint to avoid a flash.
const NO_FLASH = `(function(){try{var t=localStorage.getItem('bayouguard_theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${jbMono.variable} ${display.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="h-full font-sans bg-ob-bg text-ob-text antialiased">
        <LanguageProvider>
          {children}
          <ServiceWorker />
        </LanguageProvider>
      </body>
    </html>
  );
}
