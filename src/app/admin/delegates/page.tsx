'use client';
import { useEffect, useState, useMemo } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Search, Download, RefreshCw, Check, X, Clock } from 'lucide-react';

export default function DelegatesPage() {
  const [delegates, setDelegates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'pending'
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    setLoading(true);
    const sb = createClient();
    const [delRes, dayRes] = await Promise.all([
      sb.rpc('rlc_admin_delegates'),
      sb.rpc('rlc_admin_delegate_days'),
    ]);
    const dayMap = new Map<string, { day1: boolean; day2: boolean }>();
    (dayRes.data || []).forEach((r: any) => dayMap.set(r.delegate_id, { day1: !!r.day1, day2: !!r.day2 }));
    const merged = (delRes.data || []).map((d: any) => {
      const dd = dayMap.get(d.id) || { day1: false, day2: false };
      return { ...d, day1: dd.day1, day2: dd.day2 };
    });
    setDelegates(merged);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const specialties = useMemo(() => Array.from(new Set((delegates).map((d: any) => d.specialty).filter(Boolean))).sort(), [delegates]);

  // Day counts reflect CONFIRMED (registered) delegates only.
  const dayCounts = useMemo(() => {
    let both = 0, d1 = 0, d2 = 0;
    delegates.forEach((d: any) => {
      if (d.status !== 'registered') return;
      if (d.day1) d1++;
      if (d.day2) d2++;
      if (d.day1 && d.day2) both++;
    });
    return { both, d1, d2 };
  }, [delegates]);

  const pendingCount = useMemo(() => delegates.filter((d: any) => d.status === 'pending').length, [delegates]);
  const visibleCount = useMemo(() => delegates.filter((d: any) => d.status !== 'rejected').length, [delegates]);
  const drylabCount = useMemo(() => delegates.filter((d: any) => d.status !== 'rejected' && d.drylab_interest).length, [delegates]);

  const dayLabel = (d: any) => {
    if (d.day1 && d.day2) return 'Both';
    if (d.day1) return 'Day 1';
    if (d.day2) return 'Day 2';
    return '—';
  };

  const filtered = useMemo(() => delegates.filter((d: any) => {
    if (d.status === 'rejected') return false;                 // rejected never shown
    if (statusFilter === 'pending' && d.status !== 'pending') return false;
    const q = search.toLowerCase();
    const match = !q || d.full_name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.phone?.includes(q) || d.city?.toLowerCase().includes(q);
    const matchSpec = !filterSpec || d.specialty === filterSpec;
    const matchDay = !filterDay
      || (filterDay === 'day1' && d.day1)
      || (filterDay === 'day2' && d.day2)
      || (filterDay === 'both' && d.day1 && d.day2);
    return match && matchSpec && matchDay;
  }), [delegates, search, filterSpec, filterDay, statusFilter]);

  const approve = async (d: any) => {
    setBusyId(d.id);
    const sb = createClient();
    const { error } = await sb.rpc('rlc_admin_set_delegate_status', { p_delegate_id: d.id, p_status: 'registered' });
    if (error) { window.alert('Approve failed: ' + error.message); setBusyId(''); return; }
    // Fire the confirmation WhatsApp + QR pass now that they're approved.
    try {
      await fetch('/api/aisensy/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegate_id: d.id, full_name: d.full_name, phone: d.phone }),
      });
    } catch { /* logged server-side; approval still stands */ }
    await load();
    setBusyId('');
  };

  const reject = async (d: any) => {
    if (!window.confirm(`Reject ${d.full_name}? They'll be removed from the list and no WhatsApp will be sent.`)) return;
    setBusyId(d.id);
    const sb = createClient();
    const { error } = await sb.rpc('rlc_admin_set_delegate_status', { p_delegate_id: d.id, p_status: 'rejected' });
    if (error) { window.alert('Reject failed: ' + error.message); setBusyId(''); return; }
    await load();
    setBusyId('');
  };

  const exportCSV = () => {
    const h = ['Name','Email','Phone','City','Hospital','Specialty','Days','Status','GMC Reg','Dietary','Registered'];
    const rows = filtered.map((d: any) => [d.full_name, d.email||'', d.phone, d.city||'', d.hospital||'', d.specialty, dayLabel(d), d.status, d.mcr_number||'', d.dietary, new Date(d.created_at).toLocaleString('en-IN')]);
    const csv = [h, ...rows].map(r => r.map((c: string) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `delegates-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const fmtSpec = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  const toggleDay = (v: string) => setFilterDay(filterDay === v ? '' : v);

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold">Delegates</h1><p className="text-sm text-rlc-muted">{filtered.length} of {visibleCount} · Dry-lab opted: <span className="text-rlc-accent font-semibold">{drylabCount}</span></p></div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
              className={`rlc-btn-outline !py-2 !px-3 !border-rlc-amber/50 ${statusFilter === 'pending' ? '!bg-rlc-amber/15' : ''}`}>
              <Clock className="w-4 h-4 text-rlc-amber" /> <span className="text-rlc-amber font-semibold">{pendingCount} Pending</span>
            </button>
          )}
          <button onClick={load} className="rlc-btn-outline !py-2 !px-3"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={exportCSV} className="rlc-btn-primary !py-2 !px-4"><Download className="w-4 h-4" /> CSV</button>
        </div>
      </div>

      {/* Confirmed day attendance — tap a card to filter */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button onClick={() => toggleDay('day1')} className={`rlc-card !p-4 text-left transition ${filterDay === 'day1' ? 'ring-2 ring-rlc-accent' : ''}`}>
          <div className="text-xs text-rlc-muted">Day 1 confirmed</div>
          <div className="text-2xl font-bold text-white">{dayCounts.d1}</div>
        </button>
        <button onClick={() => toggleDay('day2')} className={`rlc-card !p-4 text-left transition ${filterDay === 'day2' ? 'ring-2 ring-rlc-accent' : ''}`}>
          <div className="text-xs text-rlc-muted">Day 2 confirmed</div>
          <div className="text-2xl font-bold text-white">{dayCounts.d2}</div>
        </button>
        <button onClick={() => toggleDay('both')} className={`rlc-card !p-4 text-left transition ${filterDay === 'both' ? 'ring-2 ring-rlc-accent' : ''}`}>
          <div className="text-xs text-rlc-muted">Both days</div>
          <div className="text-2xl font-bold text-rlc-accent">{dayCounts.both}</div>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rlc-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="rlc-input !pl-10" placeholder="Search name, email, phone..." /></div>
        <select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="rlc-select !w-auto">
          <option value="">All Days</option>
          <option value="day1">Day 1 (incl. both)</option>
          <option value="day2">Day 2 (incl. both)</option>
          <option value="both">Both days only</option>
        </select>
        <select value={filterSpec} onChange={e => setFilterSpec(e.target.value)} className="rlc-select !w-auto">
          <option value="">All Specialties</option>
          {specialties.map((s: any) => <option key={s} value={s}>{fmtSpec(s)}</option>)}
        </select>
      </div>
      <div className="rlc-card !p-0 overflow-x-auto">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Phone</th><th>City</th><th>Specialty</th><th>Day</th><th>Dry-lab</th><th>Status</th><th>Action</th><th>Registered</th></tr></thead>
          <tbody>
            {filtered.map((d: any) => (
              <tr key={d.id}>
                <td><div className="font-medium text-white">{d.full_name}</div><div className="text-xs text-rlc-muted">{d.email || 'No email'}</div></td>
                <td className="text-sm">{d.phone}</td>
                <td className="text-sm">{d.city || '—'}{d.hospital ? <span className="text-xs text-rlc-muted block">{d.hospital}</span> : null}</td>
                <td className="text-sm">{fmtSpec(d.specialty)}</td>
                <td><span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${d.day1 && d.day2 ? 'bg-rlc-accent/10 text-rlc-accent' : 'bg-rlc-amber/10 text-rlc-amber'}`}>{dayLabel(d)}</span></td>
                <td>{d.drylab_interest ? <span className="text-xs font-semibold text-rlc-accent">★ Yes</span> : <span className="text-xs text-rlc-muted">—</span>}</td>
                <td><span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${d.status === 'registered' ? 'bg-rlc-accent/10 text-rlc-accent' : d.status === 'pending' ? 'bg-rlc-amber/10 text-rlc-amber' : 'bg-rlc-red/10 text-rlc-red'}`}>{d.status === 'registered' ? 'confirmed' : d.status}</span></td>
                <td>
                  {d.status === 'pending' ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => approve(d)} disabled={busyId === d.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-rlc-accent/15 text-rlc-accent hover:bg-rlc-accent/25 disabled:opacity-40"><Check className="w-3.5 h-3.5" /> Approve</button>
                      <button onClick={() => reject(d)} disabled={busyId === d.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-rlc-red/15 text-rlc-red hover:bg-rlc-red/25 disabled:opacity-40"><X className="w-3.5 h-3.5" /> Reject</button>
                    </div>
                  ) : <span className="text-xs text-rlc-muted">—</span>}
                </td>
                <td className="text-xs text-rlc-muted whitespace-nowrap">{new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-rlc-muted">{loading ? 'Loading...' : 'No delegates found.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
