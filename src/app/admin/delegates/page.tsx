'use client';
import { useEffect, useState, useMemo } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Search, Download, RefreshCw } from 'lucide-react';

export default function DelegatesPage() {
  const [delegates, setDelegates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState('');

  const load = async () => {
    setLoading(true);
    const sb = createClient();
    const { data } = await sb.rpc('rlc_admin_delegates');
    setDelegates(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const specialties = useMemo(() => Array.from(new Set((delegates).map((d: any) => d.specialty).filter(Boolean))).sort(), [delegates]);

  const filtered = useMemo(() => delegates.filter((d: any) => {
    const q = search.toLowerCase();
    const match = !q || d.full_name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.phone?.includes(q) || d.city?.toLowerCase().includes(q);
    const matchSpec = !filterSpec || d.specialty === filterSpec;
    return match && matchSpec;
  }), [delegates, search, filterSpec]);

  const exportCSV = () => {
    const h = ['Name','Email','Phone','City','Hospital','Specialty','GMC Reg','Dietary','Status','Registered'];
    const rows = filtered.map((d: any) => [d.full_name, d.email, d.phone, d.city||'', d.hospital||'', d.specialty, d.mcr_number||'', d.dietary, d.status, new Date(d.created_at).toLocaleString('en-IN')]);
    const csv = [h, ...rows].map(r => r.map((c: string) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `delegates-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const fmtSpec = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold">Delegates</h1><p className="text-sm text-rlc-muted">{filtered.length} of {delegates.length}</p></div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rlc-btn-outline !py-2 !px-3"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={exportCSV} className="rlc-btn-primary !py-2 !px-4"><Download className="w-4 h-4" /> CSV</button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rlc-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="rlc-input !pl-10" placeholder="Search name, email, phone..." /></div>
        <select value={filterSpec} onChange={e => setFilterSpec(e.target.value)} className="rlc-select !w-auto">
          <option value="">All Specialties</option>
          {specialties.map((s: any) => <option key={s} value={s}>{fmtSpec(s)}</option>)}
        </select>
      </div>
      <div className="rlc-card !p-0 overflow-x-auto">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Phone</th><th>City</th><th>Specialty</th><th>Drylab</th><th>Status</th><th>Registered</th></tr></thead>
          <tbody>
            {filtered.map((d: any) => (
              <tr key={d.id}>
                <td><div className="font-medium text-white">{d.full_name}</div><div className="text-xs text-rlc-muted">{d.email}</div></td>
                <td className="text-sm">{d.phone}</td>
                <td className="text-sm">{d.city || '—'}{d.hospital ? <span className="text-xs text-rlc-muted block">{d.hospital}</span> : null}</td>
                <td className="text-sm">{fmtSpec(d.specialty)}</td>
                <td>{d.drylab_interest ? <span className="text-xs text-rlc-accent">★ Yes</span> : <span className="text-xs text-rlc-muted">—</span>}</td>
                <td><span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${d.status === 'registered' ? 'bg-rlc-accent/10 text-rlc-accent' : d.status === 'cancelled' ? 'bg-rlc-red/10 text-rlc-red' : 'bg-rlc-amber/10 text-rlc-amber'}`}>{d.status}</span></td>
                <td className="text-xs text-rlc-muted whitespace-nowrap">{new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-rlc-muted">{loading ? 'Loading...' : 'No delegates found.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
