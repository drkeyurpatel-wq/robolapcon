'use client';

import { useState, useCallback } from 'react';
import AdminShell from '@/components/AdminShell';
import QrScanner from '@/components/QrScanner';
import { createClient } from '@/lib/supabase/client';
import { UtensilsCrossed, Gift, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

type ScanMode = 'food' | 'gift';

export default function ScanPage() {
  const [mode, setMode] = useState<ScanMode>('food');
  const [dayNumber, setDayNumber] = useState(1);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'warn'; name: string; text: string } | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const sb = createClient();

  const handleScan = useCallback(async (id: string) => {
    if (loading || !scanning) return;
    setScanning(false);
    setLoading(true);
    setResult(null);

    const { data } = await sb.rpc('rlc_record_scan', {
      p_delegate_id: id,
      p_scan_type: mode as any,
      p_day_number: dayNumber,
    });

    const res = data as any;
    if (res?.success) {
      setResult({ type: 'success', name: res.delegate_name, text: `${mode === 'food' ? '🍽' : '🎁'} ${res.delegate_name} — ${mode} collected` });
      setScanCount((c) => c + 1);
    } else if (res?.error === 'Already scanned') {
      setResult({ type: 'warn', name: res.delegate_name || '', text: res.message || 'Already collected' });
    } else {
      setResult({ type: 'error', name: '', text: res?.message || res?.error || 'Invalid QR' });
    }

    setLoading(false);
    // Auto-reset after 3 seconds for quick scanning
    setTimeout(() => {
      setScanning(true);
      setResult(null);
    }, 3000);
  }, [loading, scanning, mode, dayNumber, sb]);

  const reset = () => {
    setScanning(true);
    setResult(null);
  };

  return (
    <AdminShell>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {mode === 'food' ? '🍽 Food Counter' : '🎁 Gift Counter'}
            </h1>
            <p className="text-sm text-rlc-muted">{scanCount} scanned this session</p>
          </div>
          <select value={dayNumber} onChange={(e) => setDayNumber(Number(e.target.value))} className="rlc-select !w-auto">
            <option value={1}>Day 1</option>
            <option value={2}>Day 2</option>
          </select>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode('food'); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              mode === 'food' ? 'bg-rlc-accent text-white' : 'bg-rlc-bg-card border border-rlc-border text-rlc-muted'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5" /> Food
          </button>
          <button
            onClick={() => { setMode('gift'); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              mode === 'gift' ? 'bg-rlc-amber text-rlc-bg' : 'bg-rlc-bg-card border border-rlc-border text-rlc-muted'
            }`}
          >
            <Gift className="w-5 h-5" /> Gift
          </button>
        </div>

        {/* Scanner */}
        <QrScanner onScan={handleScan} active={scanning} />

        {/* Result — big, visible from a distance */}
        {result && (
          <div className={`mt-6 rounded-2xl p-6 text-center ${
            result.type === 'success' ? 'bg-rlc-accent/10 border-2 border-rlc-accent' :
            result.type === 'warn' ? 'bg-rlc-amber/10 border-2 border-rlc-amber' :
            'bg-rlc-red/10 border-2 border-rlc-red'
          }`}>
            <div className="mb-2">
              {result.type === 'success' ? <CheckCircle2 className="w-12 h-12 text-rlc-accent mx-auto" /> :
               result.type === 'warn' ? <AlertCircle className="w-12 h-12 text-rlc-amber mx-auto" /> :
               <AlertCircle className="w-12 h-12 text-rlc-red mx-auto" />}
            </div>
            {result.name && <p className="text-xl font-bold text-white mb-1">{result.name}</p>}
            <p className={`text-sm ${
              result.type === 'success' ? 'text-rlc-accent' :
              result.type === 'warn' ? 'text-rlc-amber' :
              'text-rlc-red'
            }`}>{result.text}</p>
            <p className="text-xs text-rlc-muted mt-3">Auto-scanning in 3s...</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-6 text-center">
            <div className="w-8 h-8 border-2 border-rlc-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!scanning && !result && !loading && (
          <div className="mt-6 text-center">
            <button onClick={reset} className="rlc-btn-outline">
              <RotateCcw className="w-4 h-4" /> Scan Again
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
