'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';

interface QrScannerProps {
  onScan: (data: string) => void;
  active?: boolean;
}

export default function QrScanner({ onScan, active = true }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    let scanner: any = null;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            // Extract delegate ID from URL or raw UUID
            let id = decodedText;
            const match = decodedText.match(/\/d\/([a-f0-9-]{36})/);
            if (match) id = match[1];
            // Also handle raw UUIDs
            const uuidMatch = decodedText.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (uuidMatch) id = uuidMatch[1];
            onScan(id);
          },
          () => {}
        );
        setStarted(true);
      } catch (err: any) {
        setError(err?.message || 'Camera access denied');
      }
    };

    init();

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [active, onScan]);

  if (!active) {
    return (
      <div className="w-full aspect-square max-w-sm mx-auto bg-rlc-bg-light rounded-xl flex items-center justify-center">
        <CameraOff className="w-12 h-12 text-rlc-muted" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {error ? (
        <div className="aspect-square bg-rlc-bg-light rounded-xl flex flex-col items-center justify-center gap-3 p-6 text-center">
          <CameraOff className="w-12 h-12 text-rlc-red" />
          <p className="text-sm text-rlc-red">{error}</p>
          <p className="text-xs text-rlc-muted">Allow camera access and reload</p>
        </div>
      ) : (
        <div className="relative">
          {!started && (
            <div className="absolute inset-0 bg-rlc-bg-light rounded-xl flex items-center justify-center z-10">
              <Camera className="w-8 h-8 text-rlc-muted animate-pulse" />
            </div>
          )}
          <div id="qr-reader" ref={containerRef} className="rounded-xl overflow-hidden" />
        </div>
      )}
    </div>
  );
}
