import type { Metadata, Viewport } from 'next';
import { Inter, DM_Serif_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
});

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BayouGuard — Houston flood network',
  description:
    'Live flood-risk intelligence for the Houston bayou network. A real-time map of every gauge in Harris County. Built for the Congressional App Challenge 2026.',
};

export const viewport: Viewport = {
  themeColor: '#0a0c10',
  width: 'device-width',
  initialScale: 1,
};

// Set the saved theme on <html> before first paint to avoid a flash.
const NO_FLASH = `(function(){try{var t=localStorage.getItem('bayouguard_theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${dmSerif.variable} ${jbMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="h-full font-sans bg-ob-bg text-ob-text antialiased">
        {children}
      </body>
    </html>
  );
}
