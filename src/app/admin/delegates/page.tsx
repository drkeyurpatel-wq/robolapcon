'use client';

import { useEffect, useState, useMemo } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Search, Download, RefreshCw } from 'lucide-react';
import type { Delegate } from '@/types';

export default function DelegatesPage() {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpeciality, setFilterSpeciality] = useState('');
  const [filterState, setFilterState] = useState('');

  const load = async () => {
    setLoading(true);
    const sb = createClient();
    const { data } = await sb
      .from('rlc_delegates')
      .select('*')
      .order('created_at', { ascending: false });
    setDelegates(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const specialities = useMemo(
    () => Array.from(new Set(delegates.map((d) => d.speciality).filter(Boolean))).sort(),
    [delegates]
  );
  const states = useMemo(
    () => Array.from(new Set(delegates.map((d) => d.state).filter(Boolean))).sort(),
    [delegates]
  );

  const filtered = useMemo(() => {
    return delegates.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.full_name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.city?.toLowerCase().includes(q) ||
        d.registration_number?.toLowerCase().includes(q);
      const matchSpec = !filterSpeciality || d.speciality === filterSpeciality;
      const matchState = !filterState || d.state === filterState;
      return matchSearch && matchSpec && matchState;
    });
  }, [delegates, search, filterSpeciality, filterState]);

  const exportCSV = () => {
    const headers = [
      'Reg #', 'Name', 'Email', 'Phone', 'City', 'State', 'Speciality',
      'MCI Number', 'Hospital', 'Designation', 'Dietary', 'Status', 'Registered At',
    ];
    const rows = filtered.map((d) => [
      d.registration_number || '',
      d.full_name,
      d.email,
      d.phone,
      d.city,
      d.state,
      d.speciality,
      d.mci_number || '',
      d.hospital_name || '',
      d.designation || '',
      d.dietary_preference || '',
      d.status,
      new Date(d.created_at).toLocaleString('en-IN'),
    ]);
    const csv =
      [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rlc-delegates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Delegates</h1>
          <p className="text-sm text-rlc-muted">
            {filtered.length} of {delegates.length} delegates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rlc-btn-outline !py-2 !px-3">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportCSV} className="rlc-btn-primary !py-2 !px-4">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rlc-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rlc-input !pl-10"
            placeholder="Search name, email, phone, reg #..."
          />
        </div>
        <select
          value={filterSpeciality}
          onChange={(e) => setFilterSpeciality(e.target.value)}
          className="rlc-select !w-auto"
        >
          <option value="">All Specialities</option>
          {specialities.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="rlc-select !w-auto"
        >
          <option value="">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rlc-card !p-0 overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reg #</th>
              <th>Name</th>
              <th>Phone</th>
              <th>City</th>
              <th>Speciality</th>
              <th>Status</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td className="font-mono text-xs text-rlc-accent">
                  {d.registration_number || '—'}
                </td>
                <td>
                  <div className="font-medium text-white">{d.full_name}</div>
                  <div className="text-xs text-rlc-muted">{d.email}</div>
                </td>
                <td className="text-sm">{d.phone}</td>
                <td className="text-sm">
                  {d.city}
                  {d.state ? `, ${d.state}` : ''}
                </td>
                <td className="text-sm">{d.speciality}</td>
                <td>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      d.status === 'confirmed'
                        ? 'bg-rlc-accent/10 text-rlc-accent'
                        : d.status === 'cancelled'
                        ? 'bg-rlc-red/10 text-rlc-red'
                        : 'bg-rlc-amber/10 text-rlc-amber'
                    }`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="text-xs text-rlc-muted whitespace-nowrap">
                  {new Date(d.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-rlc-muted">
                  {loading ? 'Loading...' : 'No delegates found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
