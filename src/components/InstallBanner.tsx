'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Already installed as PWA?
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);

    // Android: intercept beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show banner after 5 seconds
    if (ios) {
      const dismissed = sessionStorage.getItem('rlc_ios_dismiss');
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 5000);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowBanner(false);
    setShowIosGuide(false);
    sessionStorage.setItem('rlc_ios_dismiss', '1');
  };

  if (isStandalone || !showBanner) return null;

  // iOS guide overlay
  if (showIosGuide) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center p-4 animate-fade-in-up">
        <div className="w-full max-w-sm bg-rlc-bg-card border border-rlc-border rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Install RoboLapCon</h3>
            <button onClick={dismiss} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rlc-accent/10 flex items-center justify-center shrink-0 text-sm font-bold text-rlc-accent">1</div>
              <div>
                <p className="text-white text-sm font-medium">Tap the Share button</p>
                <div className="flex items-center gap-1 mt-1">
                  <Share className="w-4 h-4 text-rlc-accent" />
                  <span className="text-xs text-white/50">at the bottom of Safari</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rlc-accent/10 flex items-center justify-center shrink-0 text-sm font-bold text-rlc-accent">2</div>
              <div>
                <p className="text-white text-sm font-medium">Tap &quot;Add to Home Screen&quot;</p>
                <div className="flex items-center gap-1 mt-1">
                  <PlusSquare className="w-4 h-4 text-rlc-accent" />
                  <span className="text-xs text-white/50">scroll down if needed</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rlc-accent/10 flex items-center justify-center shrink-0 text-sm font-bold text-rlc-accent">3</div>
              <div>
                <p className="text-white text-sm font-medium">Tap &quot;Add&quot;</p>
                <span className="text-xs text-white/50">App appears on your home screen</span>
              </div>
            </div>
          </div>
          <button onClick={dismiss} className="w-full mt-5 rlc-btn-outline !py-2.5 justify-center text-sm">Got it</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-4 animate-fade-in-up">
      <div className="max-w-lg mx-auto bg-rlc-bg-card/95 backdrop-blur-xl border border-rlc-border rounded-2xl p-4 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rlc-accent/10 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-rlc-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm">Install RoboLapCon</h3>
            <p className="text-xs text-white/50">Quick access from your home screen</p>
          </div>
          <button onClick={dismiss} className="text-white/30 hover:text-white p-1 shrink-0"><X className="w-4 h-4" /></button>
        </div>
        <div className="mt-3 flex gap-2">
          {isIos ? (
            <button onClick={() => setShowIosGuide(true)} className="flex-1 rlc-btn-amber !py-2.5 justify-center text-sm">
              Install App
            </button>
          ) : (
            <button onClick={handleInstall} className="flex-1 rlc-btn-amber !py-2.5 justify-center text-sm">
              Install App
            </button>
          )}
          <button onClick={dismiss} className="rlc-btn-outline !py-2.5 !px-4 text-sm">Later</button>
        </div>
      </div>
    </div>
  );
}
