import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NeoVerse 3D Virtual City',
    short_name: 'NeoVerse',
    description: 'Explore an open-world 3D virtual city with multiplayer and dynamic events',
    start_url: '/game',
    scope: '/',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#05070d',
    theme_color: '#060911',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable' as any,
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable' as any,
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
