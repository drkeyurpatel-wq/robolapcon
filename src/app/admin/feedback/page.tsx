'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import {
  Star, MessageSquare, ThumbsUp, CalendarCheck, RefreshCw, Search,
  Stethoscope, Phone, Activity, Scissors, Building2, UtensilsCrossed, Cpu,
} from 'lucide-react';

type Row = {
  id: string;
  delegate_name: string | null;
  delegate_phone: string | null;
  speciality: string | null;
  linked: boolean;
  overall_rating: number | null;
  surgery_quality: number | null;
  venue_rating: number | null;
  food_rating: number | null;
  drylab_rating: number | null;
  would_recommend: boolean | null;
  best_part: string | null;
  improve: string | null;
  attend_next_year: string | null;
  additional_comments: string | null;
  created_at: string;
};

const fmtSpec = (s: string | null) =>
  s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

const avg = (rows: Row[], key: keyof Row) => {
  const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === 'number');
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  // rounded to nearest 0.5 for display
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-rlc-bg-light" style={{ width: size, height: size }} fill="currentColor" />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: fill === 0.5 ? size / 2 : size }}>
                <Star className="text-rlc-amber" style={{ width: size, height: size }} fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, accent = 'accent' }:
  { icon: any; label: string; value: string; sub?: string; accent?: 'accent' | 'amber' }) {
  const color = accent === 'accent' ? 'text-rlc-accent' : 'text-rlc-amber';
  const bg = accent === 'accent' ? 'bg-rlc-accent/10' : 'bg-rlc-amber/10';
  return (
    <div className="rlc-card">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
      <p className="text-sm text-rlc-muted">{label}</p>
      <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
      {sub && <p className="text-xs text-rlc-muted mt-1">{sub}</p>}
    </div>
  );
}

const RATING_KEYS: { key: keyof Row; label: string; icon: any }[] = [
  { key: 'overall_rating', label: 'Overall', icon: Star },
  { key: 'surgery_quality', label: 'Surgery Quality', icon: Scissors },
  { key: 'venue_rating', label: 'Venue', icon: Building2 },
  { key: 'food_rating', label: 'Food', icon: UtensilsCrossed },
  { key: 'drylab_rating', label: 'Dry Lab', icon: Cpu },
];

export default function FeedbackPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true); setErr(null);
    const sb = createClient();
    const { data, error } = await sb.rpc('rlc_admin_feedback');
    if (error) { setErr(error.message); setRows([]); }
    else setRows((data || []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const all = rows || [];
  const n = all.length;

  const recommendPct = useMemo(() => {
    const v = all.filter((r) => r.would_recommend != null);
    if (!v.length) return 0;
    return (v.filter((r) => r.would_recommend).length / v.length) * 100;
  }, [all]);

  const bySpec = useMemo(() => {
    const m: Record<string, Row[]> = {};
    all.forEach((r) => { const s = r.speciality || 'other'; (m[s] ||= []).push(r); });
    return Object.entries(m)
      .map(([spec, rs]) => ({ spec, count: rs.length, avgOverall: avg(rs, 'overall_rating') }))
      .sort((a, b) => b.count - a.count);
  }, [all]);

  const attendTally = useMemo(() => {
    const m: Record<string, number> = {};
    all.forEach((r) => { const a = (r.attend_next_year || '—').trim() || '—'; m[a] = (m[a] || 0) + 1; });
    return Object.entries(m).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [all]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((r) =>
      (r.delegate_name || '').toLowerCase().includes(t) ||
      (r.delegate_phone || '').toLowerCase().includes(t) ||
      fmtSpec(r.speciality).toLowerCase().includes(t));
  }, [all, q]);

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <button onClick={load} className="rlc-btn-outline !py-2 !px-3"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {err && <div className="rlc-card border border-rlc-red/40 text-rlc-red mb-6 text-sm">Couldn’t load feedback: {err}</div>}

      {rows === null ? (
        <p className="text-center text-rlc-muted py-12">Loading feedback…</p>
      ) : n === 0 ? (
        <div className="rlc-card text-center py-12">
          <MessageSquare className="w-8 h-8 text-rlc-muted mx-auto mb-3" />
          <p className="text-rlc-muted">No feedback submitted yet.</p>
          <p className="text-xs text-rlc-muted mt-1">Responses appear here as delegates submit the form.</p>
        </div>
      ) : (<>
        {/* Summary */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard icon={MessageSquare} label="Responses" value={String(n)} accent="accent" />
          <SummaryCard icon={Star} label="Avg Overall" value={avg(all, 'overall_rating').toFixed(1)} sub="out of 5" accent="amber" />
          <SummaryCard icon={ThumbsUp} label="Would Recommend" value={`${recommendPct.toFixed(0)}%`} accent="accent" />
          <SummaryCard icon={CalendarCheck} label="Linked to Reg." value={`${all.filter((r) => r.linked).length}/${n}`} accent="accent" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Ratings MIS */}
          <div className="rlc-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-rlc-accent" /> Average Ratings</h3>
            <div className="space-y-3">
              {RATING_KEYS.map(({ key, label, icon: Icon }) => {
                const a = avg(all, key);
                return (
                  <div key={String(key)} className="flex items-center justify-between gap-3">
                    <span className="text-sm flex items-center gap-2 min-w-[8.5rem]"><Icon className="w-3.5 h-3.5 text-rlc-muted" /> {label}</span>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <Stars value={a} />
                      <span className="text-sm font-semibold text-rlc-amber w-8 text-right">{a.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attend next year */}
          <div className="rlc-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-rlc-amber" /> Attend Next Year</h3>
            <div className="space-y-3">
              {attendTally.map((a) => (
                <div key={a.label} className="flex items-center justify-between">
                  <span className="text-sm">{a.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-rlc-bg-light rounded-full overflow-hidden"><div className="h-full bg-rlc-amber rounded-full" style={{ width: `${(a.count / n) * 100}%` }} /></div>
                    <span className="text-sm font-medium text-rlc-amber w-8 text-right">{a.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-speciality */}
        <div className="rlc-card mb-8">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-rlc-accent" /> By Speciality</h3>
          <div className="space-y-3">
            {bySpec.map((s) => (
              <div key={s.spec} className="flex items-center justify-between gap-3">
                <span className="text-sm min-w-[10rem]">{fmtSpec(s.spec)}</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <Stars value={s.avgOverall} />
                  <span className="text-xs text-rlc-muted w-10 text-right">{s.avgOverall.toFixed(1)}★</span>
                  <span className="text-sm font-medium text-rlc-accent w-8 text-right">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Individual feedback */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Individual Responses <span className="text-rlc-muted font-normal">({filtered.length})</span></h3>
          <div className="relative">
            <Search className="w-4 h-4 text-rlc-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / phone / speciality"
              className="rlc-input !pl-9 !py-2 text-sm w-64 max-w-full" />
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="rlc-card">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-semibold">{r.delegate_name || 'Anonymous'}</p>
                  <p className="text-xs text-rlc-muted flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                    {r.delegate_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.delegate_phone}</span>}
                    <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" /> {fmtSpec(r.speciality)}</span>
                    {r.linked && <span className="text-rlc-accent">● linked</span>}
                  </p>
                </div>
                <div className="text-right">
                  {r.would_recommend != null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.would_recommend ? 'bg-rlc-accent/10 text-rlc-accent' : 'bg-rlc-red/10 text-rlc-red'}`}>
                      {r.would_recommend ? 'Recommends' : 'Would not recommend'}
                    </span>
                  )}
                  <p className="text-[11px] text-rlc-muted mt-1">{new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                {RATING_KEYS.map(({ key, label }) => (
                  <div key={String(key)} className="text-center">
                    <p className="text-[11px] text-rlc-muted mb-0.5">{label}</p>
                    <Stars value={(r[key] as number) || 0} size={12} />
                  </div>
                ))}
              </div>

              {(r.best_part || r.improve || r.additional_comments || r.attend_next_year) && (
                <div className="space-y-2 text-sm border-t border-rlc-bg-light pt-3">
                  {r.best_part && <p><span className="text-rlc-muted">Best part: </span>{r.best_part}</p>}
                  {r.improve && <p><span className="text-rlc-muted">To improve: </span>{r.improve}</p>}
                  {r.attend_next_year && <p><span className="text-rlc-muted">Attend next year: </span>{r.attend_next_year}</p>}
                  {r.additional_comments && <p><span className="text-rlc-muted">Comments: </span>{r.additional_comments}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </>)}
    </AdminShell>
  );
}
