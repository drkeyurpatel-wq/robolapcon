'use client';

import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { UtensilsCrossed, Gift } from 'lucide-react';

export default function ScanChooser() {
  return (
    <AdminShell>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-1">Counters</h1>
        <p className="text-sm text-rlc-muted mb-6">Pick the station you are running.</p>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/scan/food" className="rlc-card !p-6 flex flex-col items-center gap-3 hover:border-rlc-accent transition">
            <UtensilsCrossed className="w-10 h-10 text-rlc-accent" />
            <span className="font-semibold">Food Counter</span>
          </Link>
          <Link href="/admin/scan/gift" className="rlc-card !p-6 flex flex-col items-center gap-3 hover:border-rlc-amber transition">
            <Gift className="w-10 h-10 text-rlc-amber" />
            <span className="font-semibold">Gift Counter</span>
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
