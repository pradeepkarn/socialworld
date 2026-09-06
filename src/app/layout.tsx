import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeoVerse | 3D Virtual City - Next.js + Babylon.js',
  description:
    'Explore an open-world 3D virtual city built with Next.js, TypeScript, and Babylon.js. Walk, run, explore shops, and experience dynamic day/night lighting.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NeoVerse',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#060911',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
