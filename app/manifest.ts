import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BayouGuard',
    short_name: 'BayouGuard',
    description: 'Hyperlocal flood risk for Houston, in English, Spanish and Vietnamese.',
    start_url: '/map',
    display: 'standalone',
    background_color: '#F0F5FF',
    theme_color: '#1A4480',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
