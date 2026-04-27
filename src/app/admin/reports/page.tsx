'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Users, UserCheck, MapPin, Stethoscope, MessageSquare, RefreshCw, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const sb = createClient();
    const { data: delegates } = await sb.rpc('rlc_admin_delegates');
    const { data: messages } = await sb.rpc('rlc_admin_whatsapp');

    const all = delegates || [];
    const today = new Date().toISOString().slice(0, 10);

    const cityMap: Record<string, number> = {};
    all.forEach((d: any) => { const c = d.city || 'Unknown'; cityMap[c] = (cityMap[c] || 0) + 1; });
    const topCities = Object.entries(cityMap).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const specMap: Record<string, number> = {};
    all.forEach((d: any) => { const s = d.specialty || 'unknown'; specMap[s] = (specMap[s] || 0) + 1; });
    const topSpecs = Object.entries(specMap).map(([spec, count]) => ({ spec, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const msgs = messages || [];
    const drylabCount = all.filter((d: any) => d.drylab_interest).length;

    setStats({
      total: all.length,
      registered: all.filter((d: any) => d.status === 'registered').length,
      cancelled: all.filter((d: any) => d.status === 'cancelled').length,
      todayRegs: all.filter((d: any) => d.created_at?.startsWith(today)).length,
      drylabCount,
      topCities, topSpecs,
      whatsappSent: msgs.filter((m: any) => ['sent','delivered','read'].includes(m.status)).length,
      whatsappFailed: msgs.filter((m: any) => m.status === 'failed').length,
    });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fmtSpec = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || '';

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button onClick={load} className="rlc-btn-outline !py-2 !px-3"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      {stats ? (<>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total Delegates" value={stats.total} accent="accent" />
          <StatCard icon={UserCheck} label="Registered" value={stats.registered} accent="accent" />
          <StatCard icon={Users} label="Today" value={stats.todayRegs} accent="amber" />
          <StatCard icon={BarChart3} label="Drylab Opt-in" value={stats.drylabCount} accent="accent" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={MessageSquare} label="WhatsApp Sent" value={stats.whatsappSent} sub={stats.whatsappFailed > 0 ? `${stats.whatsappFailed} failed` : undefined} accent="accent" />
          <StatCard icon={Users} label="Cancelled" value={stats.cancelled} accent="amber" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rlc-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-rlc-accent" /> Top Cities</h3>
            <div className="space-y-3">
              {stats.topCities.map((c: any) => (
                <div key={c.city} className="flex items-center justify-between">
                  <span className="text-sm">{c.city}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-rlc-bg-light rounded-full overflow-hidden"><div className="h-full bg-rlc-accent rounded-full" style={{ width: `${(c.count / stats.total) * 100}%` }} /></div>
                    <span className="text-sm font-medium text-rlc-accent w-8 text-right">{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rlc-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-rlc-amber" /> Top Specialties</h3>
            <div className="space-y-3">
              {stats.topSpecs.map((s: any) => (
                <div key={s.spec} className="flex items-center justify-between">
                  <span className="text-sm">{fmtSpec(s.spec)}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-rlc-bg-light rounded-full overflow-hidden"><div className="h-full bg-rlc-amber rounded-full" style={{ width: `${(s.count / stats.total) * 100}%` }} /></div>
                    <span className="text-sm font-medium text-rlc-amber w-8 text-right">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>) : <p className="text-center text-rlc-muted py-12">Loading stats...</p>}
    </AdminShell>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: number; sub?: string; accent: 'accent' | 'amber' }) {
  const color = accent === 'accent' ? 'text-rlc-accent' : 'text-rlc-amber';
  const bg = accent === 'accent' ? 'bg-rlc-accent/10' : 'bg-rlc-amber/10';
  return (
    <div className="rlc-card">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
      <p className="text-sm text-rlc-muted">{label}</p>
      <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
      {sub && <p className="text-xs text-rlc-red mt-1">{sub}</p>}
    </div>
  );
}
