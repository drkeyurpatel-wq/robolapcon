'use client';

import { useEffect, useState } from 'react';
import { Radio, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const EVENT_SLUG = 'robolapcon-2026';

function isEventDayIST(): boolean {
  // Event runs Jun 20-21, 2026 IST (Asia/Kolkata)
  // Show banner from start of Jun 20 through end of Jun 21 in IST
  // Use IST string comparison via toLocaleDateString to avoid TZ math errors
  const now = new Date();
  const istDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return istDate === '2026-06-20' || istDate === '2026-06-21';
}

export function LiveBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show on admin routes
    if (pathname?.startsWith('/admin')) return;
    // Don't show on the live page itself or its sub-routes
    if (pathname?.startsWith(`/${EVENT_SLUG}/live`)) return;

    // Check dismissal (session-scoped)
    try {
      if (sessionStorage.getItem('rlc_live_banner_dismissed') === '1') {
        setDismissed(true);
        return;
      }
    } catch {}

    if (isEventDayIST()) {
      setShow(true);
    }

    // Re-check at midnight in case session spans midnight IST
    const interval = setInterval(() => {
      setShow(isEventDayIST());
    }, 60_000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    try { sessionStorage.setItem('rlc_live_banner_dismissed', '1'); } catch {}
  };

  if (!show || dismissed) return null;

  return (
    <a
      href={`/${EVENT_SLUG}/live`}
      className="animate-fade-in-up fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-40 bg-rlc-red text-white rounded-2xl shadow-2xl shadow-black/40 px-4 py-3 flex items-center gap-3 hover:brightness-110 transition-all"
    >
      <div className="relative shrink-0">
        <Radio className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">LIVE NOW — Tap to join</p>
        <p className="text-xs opacity-80 leading-tight mt-0.5">Polls, Q&amp;A & commentary</p>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 -mr-1 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </a>
  );
}
