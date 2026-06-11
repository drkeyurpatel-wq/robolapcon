'use client';

import { useState, useCallback } from 'react';
import AdminShell from '@/components/AdminShell';
import QrScanner from '@/components/QrScanner';
import { createClient } from '@/lib/supabase/client';
import { UserCheck, Printer, RotateCcw, CheckCircle2, AlertCircle, Search, ScanLine } from 'lucide-react';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

interface DelegateInfo {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  specialty: string;
  specialty_other: string | null;
  hospital: string | null;
  city: string | null;
  drylab_interest: boolean;
  dietary: string;
  status: string;
  scans: { type: string; day: number; at: string }[];
}

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

export default function CheckinPage() {
  const [mode, setMode] = useState<'scan' | 'search'>('scan');
  const [delegate, setDelegate] = useState<DelegateInfo | null>(null);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [dayNumber, setDayNumber] = useState(1);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [printing, setPrinting] = useState(false);

  const sb = createClient();

  const loadDelegate = useCallback(async (id: string) => {
    setLoading(true);
    setMessage(null);
    setCheckedIn(false);

    const { data } = await sb.rpc('rlc_lookup_delegate', { p_delegate_id: id });
    const result = data as any;

    if (!result?.success) {
      setMessage({ type: 'error', text: 'Delegate not found. Invalid QR code.' });
      setLoading(false);
      return;
    }

    setDelegate(result);
    const alreadyCheckedIn = result.scans?.some(
      (s: any) => s.type === 'checkin' && s.day === dayNumber
    );
    setCheckedIn(alreadyCheckedIn);
    setLoading(false);
  }, [dayNumber, sb]);

  const handleScan = useCallback(async (id: string) => {
    if (loading || !scanning) return;
    setScanning(false);
    await loadDelegate(id);
  }, [loading, scanning, loadDelegate]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setHits([]); return; }
    const { data } = await sb.rpc('rlc_search_delegates', { p_query: q });
    setHits((data as any) || []);
  };

  const selectHit = async (id: string) => {
    setHits([]);
    setQuery('');
    setScanning(false);
    await loadDelegate(id);
  };

  const handleCheckin = async () => {
    if (!delegate) return;
    setLoading(true);

    const { data } = await sb.rpc('rlc_record_scan', {
      p_delegate_id: delegate.id,
      p_scan_type: 'checkin' as any,
      p_day_number: dayNumber,
    });

    const result = data as any;
    if (result?.success) {
      setCheckedIn(true);
      setMessage({ type: 'success', text: `${delegate.full_name} checked in!` });
    } else {
      setMessage({ type: result?.error === 'Already scanned' ? 'success' : 'error', text: result?.message || 'Check-in failed' });
      if (result?.error === 'Already scanned') setCheckedIn(true);
    }
    setLoading(false);
  };

  const handlePrint = async () => {
    if (!delegate || printing) return;
    setPrinting(true);
    const { data } = await sb.rpc('rlc_queue_print', {
      p_delegate_id: delegate.id,
      p_day_number: dayNumber,
    });
    const result = data as any;
    if (result?.success) {
      setMessage({ type: 'success', text: `🖨 Badge sent to printer — ${result.delegate_name}` });
    } else {
      setMessage({ type: 'error', text: 'Print queue failed — use the desk laptop directly.' });
    }
    setPrinting(false);
  };

  const reset = () => {
    setDelegate(null);
    setScanning(true);
    setMessage(null);
    setCheckedIn(false);
    setHits([]);
    setQuery('');
  };

  const specialtyDisplay = (d: { specialty: string; specialty_other: string | null }) =>
    d.specialty === 'other'
      ? d.specialty_other || 'Other'
      : d.specialty.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <AdminShell>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Check-in Desk</h1>
            <p className="text-sm text-rlc-muted">Scan QR or search name to check in &amp; print badge</p>
          </div>
          <select
            value={dayNumber}
            onChange={(e) => setDayNumber(Number(e.target.value))}
            className="rlc-select !w-auto"
          >
            <option value={1}>Day 1</option>
            <option value={2}>Day 2</option>
          </select>
        </div>

        {/* Mode tabs */}
        {!delegate && (
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => { setMode('scan'); setScanning(true); setHits([]); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition ${
                mode === 'scan' ? 'border-rlc-accent text-rlc-accent bg-rlc-accent/10' : 'border-rlc-border text-rlc-muted'
              }`}
            >
              <ScanLine className="w-4 h-4" /> Scan QR
            </button>
            <button
              onClick={() => { setMode('search'); setScanning(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition ${
                mode === 'search' ? 'border-rlc-accent text-rlc-accent bg-rlc-accent/10' : 'border-rlc-border text-rlc-muted'
              }`}
            >
              <Search className="w-4 h-4" /> Search
            </button>
          </div>
        )}

        {/* Scanner */}
        {mode === 'scan' && scanning && !delegate && (
          <div className="mb-6">
            <QrScanner onScan={handleScan} active={scanning} />
            <p className="text-center text-xs text-rlc-muted mt-3">Point camera at delegate&apos;s WhatsApp QR code</p>
          </div>
        )}

        {/* Search */}
        {mode === 'search' && !delegate && (
          <div className="mb-6">
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
                <p className="text-sm text-rlc-muted text-center py-3">No delegates match &ldquo;{query}&rdquo;</p>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !delegate && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-rlc-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-rlc-muted mt-3">Looking up delegate...</p>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 ${
            message.type === 'success' ? 'bg-rlc-accent/10 text-rlc-accent' : 'bg-rlc-red/10 text-rlc-red'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Delegate Card */}
        {delegate && (
          <div className="rlc-card mb-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-rlc-bg-light flex items-center justify-center shrink-0">
                <img
                  src={`${QR_API}?data=${encodeURIComponent(delegate.id)}&size=120x120&format=png`}
                  alt="QR"
                  className="w-14 h-14"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">{delegate.full_name}</h2>
                <p className="text-sm text-rlc-accent">{specialtyDisplay(delegate)}</p>
                {delegate.hospital && <p className="text-sm text-rlc-muted">{delegate.hospital}</p>}
                {delegate.city && <p className="text-sm text-rlc-muted">{delegate.city}</p>}
                <p className="text-xs text-rlc-muted mt-1">{delegate.phone} &middot; {delegate.email}</p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-rlc-border">
              {delegate.drylab_interest && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rlc-accent/10 text-rlc-accent">
                  ★ Simulation Opt-in
                </span>
              )}
              {delegate.dietary !== 'no_restrictions' && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rlc-amber/10 text-rlc-amber">
                  Dietary: {delegate.dietary}
                </span>
              )}
              {checkedIn && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">
                  ✓ Checked in Day {dayNumber}
                </span>
              )}
              {delegate.scans?.filter((s: any) => s.type === 'food').map((s: any) => (
                <span key={`food-${s.day}`} className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400">
                  🍽 Food D{s.day}
                </span>
              ))}
              {delegate.scans?.filter((s: any) => s.type === 'gift').map((s: any) => (
                <span key={`gift-${s.day}`} className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400">
                  🎁 Gift D{s.day}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              {!checkedIn ? (
                <button onClick={handleCheckin} disabled={loading} className="rlc-btn-primary flex-1 !py-3 disabled:opacity-50">
                  <UserCheck className="w-5 h-5" /> Check In Day {dayNumber}
                </button>
              ) : (
                <button onClick={handlePrint} disabled={printing} className="rlc-btn-amber flex-1 !py-3 disabled:opacity-50">
                  <Printer className="w-5 h-5" /> {printing ? 'Sending…' : 'Print Badge'}
                </button>
              )}
              <button onClick={reset} className="rlc-btn-outline !py-3 !px-4">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Not found — show reset */}
        {mode === 'scan' && !scanning && !delegate && !loading && (
          <div className="text-center py-8">
            <button onClick={reset} className="rlc-btn-outline">
              <RotateCcw className="w-4 h-4" /> Scan Another
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
