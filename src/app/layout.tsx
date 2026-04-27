import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ROBOLAPCON 2026 — National Robotic & Laparoscopic Surgery Conference',
  description:
    'Join India\'s premier robotic and laparoscopic surgery conference. 2 days, 6 tracks, 50+ faculty, live surgeries, and hands-on workshops.',
  openGraph: {
    title: 'ROBOLAPCON 2026',
    description: 'National Robotic & Laparoscopic Surgery Conference',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-outfit antialiased">{children}</body>
    </html>
  );
}
