'use client';

import { useState, useCallback } from 'react';
import AdminShell from '@/components/AdminShell';
import QrScanner from '@/components/QrScanner';
import { createClient } from '@/lib/supabase/client';
import { UtensilsCrossed, Gift, CheckCircle2, AlertCircle, RotateCcw, ScanLine, Search } from 'lucide-react';

type Counter = 'food' | 'gift';
type InputMode = 'scan' | 'search';

interface SearchHit {
  id: string;
  full_name: string;
  phone: string;
  specialty: string;
  specialty_other: string | null;
  hospital: string | null;
  city: string | null;
  status: string;
}

export default function ScanPage() {
  const [mode, setMode] = useState<Counter>('food');
  const [inputMode, setInputMode] = useState<InputMode>('scan');
  const [dayNumber, setDayNumber] = useState(1);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'warn'; name: string; text: string } | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);

  const sb = createClient();

  // Core action: record the food/gift scan and (for gift) queue the certificate.
  // Used by both the QR scanner and the name-search selection.
  const record = useCallback(async (id: string) => {
    setLoading(true);
    setResult(null);

    const { data } = await sb.rpc('rlc_record_scan', {
      p_delegate_id: id,
      p_scan_type: mode as any,
      p_day_number: dayNumber,
    });

    const res = data as any;
    if (res?.success) {
      let extra = '';
      if (mode === 'gift') {
        try {
          const { data: cert } = await sb.rpc('rlc_queue_certificate', {
            p_delegate_id: id,
            p_day_number: dayNumber,
          });
          if ((cert as any)?.success) {
            extra = (cert as any).already_issued ? ' · cert already queued' : ' · 🎓 cert queued';
          }
        } catch (_) {
          /* cert queue is best-effort; never block the gift scan */
        }
      }
      setResult({ type: 'success', name: res.delegate_name, text: `${mode === 'food' ? '🍽' : '🎁'} ${res.delegate_name} — ${mode} collected${extra}` });
      setScanCount((c) => c + 1);
    } else if (res?.error === 'Already scanned') {
      setResult({ type: 'warn', name: res.delegate_name || '', text: res.message || 'Already collected' });
    } else {
      setResult({ type: 'error', name: '', text: res?.message || res?.error || 'Invalid QR' });
    }

    setLoading(false);
    setQuery('');
    setHits([]);
    // Auto-reset after 3 seconds for quick scanning
    setTimeout(() => {
      setScanning(true);
      setResult(null);
    }, 3000);
  }, [mode, dayNumber, sb]);

  const handleScan = useCallback(async (id: string) => {
    if (loading || !scanning) return;
    setScanning(false);
    await record(id);
  }, [loading, scanning, record]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setHits([]); return; }
    const { data } = await sb.rpc('rlc_search_delegates', { p_query: q });
    setHits((data as any) || []);
  };

  const selectHit = async (id: string) => {
    setHits([]);
    setQuery('');
    await record(id);
  };

  const reset = () => {
    setScanning(true);
    setResult(null);
    setQuery('');
    setHits([]);
  };

  const specialtyDisplay = (d: { specialty: string; specialty_other: string | null }) =>
    d.specialty === 'other'
      ? d.specialty_other || 'Other'
      : d.specialty.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

        {/* Counter Toggle */}
        <div className="flex gap-2 mb-4">
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

        {/* Scan / Search Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setInputMode('scan'); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition ${
              inputMode === 'scan' ? 'border-rlc-accent text-rlc-accent bg-rlc-accent/10' : 'border-rlc-border text-rlc-muted'
            }`}
          >
            <ScanLine className="w-4 h-4" /> Scan QR
          </button>
          <button
            onClick={() => { setInputMode('search'); setScanning(false); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition ${
              inputMode === 'search' ? 'border-rlc-accent text-rlc-accent bg-rlc-accent/10' : 'border-rlc-border text-rlc-muted'
            }`}
          >
            <Search className="w-4 h-4" /> Search
          </button>
        </div>

        {/* Scanner */}
        {inputMode === 'scan' && <QrScanner onScan={handleScan} active={scanning} />}

        {/* Search */}
        {inputMode === 'search' && !result && (
          <div className="mb-2">
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Name or phone number…"
              autoFocus
              className="rlc-input w-full !py-3 !text-base"
            />
            <div className="mt-3 space-y-2">
              {hits.map((h) => (
                <button
                  key={h.id}
                  onClick={() => selectHit(h.id)}
                  className="w-full text-left rlc-card !p-4 hover:border-rlc-accent transition"
                >
                  <div className="font-semibold text-white">{h.full_name}</div>
                  <div className="text-xs text-rlc-muted mt-0.5">
                    {specialtyDisplay(h)}
                    {h.hospital ? ` · ${h.hospital}` : ''}
                    {h.city ? ` · ${h.city}` : ''} · {h.phone}
                  </div>
                </button>
              ))}
              {query.trim().length >= 2 && hits.length === 0 && (
                <p className="text-sm text-rlc-muted text-center py-3">No delegates match {`"${query}"`}</p>
              )}
            </div>
          </div>
        )}

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
            <p className="text-xs text-rlc-muted mt-3">Auto-resetting in 3s...</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-6 text-center">
            <div className="w-8 h-8 border-2 border-rlc-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {inputMode === 'scan' && !scanning && !result && !loading && (
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
