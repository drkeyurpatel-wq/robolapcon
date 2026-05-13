import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#00A99D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://robolapcon.in'),
  title: 'ROBOLAPCON 2026 — National Robotic & Laparoscopic Surgery Conference',
  description:
    'Join India\'s premier robotic and laparoscopic surgery conference. 2 days, 10 live surgeries, 25+ faculty, hands-on workshops.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RoboLapCon',
  },
  openGraph: {
    title: 'ROBOLAPCON 2026',
    description: 'National Robotic & Laparoscopic Surgery Conference',
    type: 'website',
    url: 'https://robolapcon.in',
    siteName: 'RoboLapCon 2026',
  },
};

import { InstallBanner } from '@/components/InstallBanner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="font-outfit antialiased">
        {children}
        <InstallBanner />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}`,
          }}
        />
      </body>
    </html>
  );
}
