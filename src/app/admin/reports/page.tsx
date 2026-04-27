'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Users, UserCheck, MapPin, Stethoscope, MessageSquare, RefreshCw } from 'lucide-react';

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  topCities: { city: string; count: number }[];
  topSpecialities: { speciality: string; count: number }[];
  whatsappSent: number;
  whatsappFailed: number;
  todayRegistrations: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const sb = createClient();

    const { data: delegates } = await sb.from('rlc_delegates').select('*');
    const { data: messages } = await sb.from('rlc_whatsapp_messages').select('status');

    const all = delegates || [];
    const today = new Date().toISOString().slice(0, 10);

    // City counts
    const cityMap: Record<string, number> = {};
    all.forEach((d) => {
      const c = d.city || 'Unknown';
      cityMap[c] = (cityMap[c] || 0) + 1;
    });
    const topCities = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Speciality counts
    const specMap: Record<string, number> = {};
    all.forEach((d) => {
      const s = d.speciality || 'Unknown';
      specMap[s] = (specMap[s] || 0) + 1;
    });
    const topSpecialities = Object.entries(specMap)
      .map(([speciality, count]) => ({ speciality, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const msgs = messages || [];

    setStats({
      total: all.length,
      confirmed: all.filter((d) => d.status === 'confirmed').length,
      pending: all.filter((d) => d.status === 'registered' || d.status === 'pending').length,
      topCities,
      topSpecialities,
      whatsappSent: msgs.filter((m) => m.status === 'sent' || m.status === 'delivered' || m.status === 'read').length,
      whatsappFailed: msgs.filter((m) => m.status === 'failed').length,
      todayRegistrations: all.filter((d) => d.created_at?.startsWith(today)).length,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button onClick={load} className="rlc-btn-outline !py-2 !px-3">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {stats ? (
        <>
          {/* Stat cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Total Delegates"
              value={stats.total}
              accent="accent"
            />
            <StatCard
              icon={UserCheck}
              label="Confirmed"
              value={stats.confirmed}
              accent="accent"
            />
            <StatCard
              icon={Users}
              label="Today"
              value={stats.todayRegistrations}
              accent="amber"
            />
            <StatCard
              icon={MessageSquare}
              label="WhatsApp Sent"
              value={stats.whatsappSent}
              sub={stats.whatsappFailed > 0 ? `${stats.whatsappFailed} failed` : undefined}
              accent="accent"
            />
          </div>

          {/* Breakdowns */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rlc-card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rlc-accent" /> Top Cities
              </h3>
              <div className="space-y-3">
                {stats.topCities.map((c) => (
                  <div key={c.city} className="flex items-center justify-between">
                    <span className="text-sm">{c.city}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-rlc-bg-light rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rlc-accent rounded-full"
                          style={{
                            width: `${(c.count / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-rlc-accent w-8 text-right">
                        {c.count}
                      </span>
                    </div>
                  </div>
                ))}
                {stats.topCities.length === 0 && (
                  <p className="text-sm text-rlc-muted">No data yet.</p>
                )}
              </div>
            </div>

            <div className="rlc-card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-rlc-amber" /> Top Specialities
              </h3>
              <div className="space-y-3">
                {stats.topSpecialities.map((s) => (
                  <div key={s.speciality} className="flex items-center justify-between">
                    <span className="text-sm">{s.speciality}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-rlc-bg-light rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rlc-amber rounded-full"
                          style={{
                            width: `${(s.count / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-rlc-amber w-8 text-right">
                        {s.count}
                      </span>
                    </div>
                  </div>
                ))}
                {stats.topSpecialities.length === 0 && (
                  <p className="text-sm text-rlc-muted">No data yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-rlc-muted py-12">Loading stats...</p>
      )}
    </AdminShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  accent: 'accent' | 'amber';
}) {
  const color = accent === 'accent' ? 'text-rlc-accent' : 'text-rlc-amber';
  const bg = accent === 'accent' ? 'bg-rlc-accent/10' : 'bg-rlc-amber/10';
  return (
    <div className="rlc-card">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-sm text-rlc-muted">{label}</p>
      <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
      {sub && <p className="text-xs text-rlc-red mt-1">{sub}</p>}
    </div>
  );
}
