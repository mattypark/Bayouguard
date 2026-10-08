import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BayouGuard — Texas floodwater, mapped',
  description:
    'Live water levels from every river and bayou gauge in Texas, and what they mean for your address. Built for the Congressional App Challenge 2026.',
};

export const viewport: Viewport = {
  themeColor: '#fbf6ef',
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
      className={`${inter.variable} ${jbMono.variable} h-full`}
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
