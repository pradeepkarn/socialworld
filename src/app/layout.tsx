import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeoVerse | 3D Virtual City - Next.js + Babylon.js',
  description:
    'Explore an open-world 3D virtual city built with Next.js, TypeScript, and Babylon.js. Walk, run, explore shops, and experience dynamic day/night lighting.',
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
