'use client';
import { useEffect, useState, useCallback } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Users, UserCheck, UtensilsCrossed, Gift, RefreshCw, Activity } from 'lucide-react';

interface Stats {
  registered: number;
  entered_d1: number;
  entered_d2: number;
  entered_total_unique: number;
  food_d1: number;
  food_d2: number;
  food_total: number;
  gifts: number;
  entries_by_hour: { hour: number; count: number }[];
  generated_at: string;
}

type DayView = 1 | 2 | 0; // 0 = both

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [day, setDay] = useState<DayView>(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const load = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.rpc('rlc_event_stats', { p_day_filter: day === 0 ? null : day });
    if (data) {
      setStats(data as Stats);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }
    setLoading(false);
  }, [day]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !stats) {
    return <AdminShell><div className="text-rlc-muted">Loading dashboard…</div></AdminShell>;
  }

  const entered = day === 1 ? stats!.entered_d1 : day === 2 ? stats!.entered_d2 : stats!.entered_total_unique;
  const food = day === 1 ? stats!.food_d1 : day === 2 ? stats!.food_d2 : stats!.food_total;
  const gifts = stats!.gifts; // gifts are per-event regardless of day filter
  const registered = stats!.registered;

  const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 100) : 0);

  // Max entries-by-hour for chart scaling
  const maxHourCount = Math.max(1, ...stats!.entries_by_hour.map(h => h.count));

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6 text-rlc-accent" /> Live Dashboard</h1>
          <p className="text-sm text-rlc-muted">Auto-refreshes every 30s · Last updated {lastUpdated}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-rlc-bg-card border border-rlc-border rounded-lg p-1">
            {[
              { v: 0 as DayView, label: 'Both' },
              { v: 1 as DayView, label: 'Day 1' },
              { v: 2 as DayView, label: 'Day 2' },
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => setDay(opt.v)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  day === opt.v ? 'bg-rlc-accent text-white' : 'text-rlc-muted hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded-lg bg-rlc-bg-card border border-rlc-border hover:bg-white/5 transition-colors" title="Refresh now">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 main counter cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CounterCard
          icon={Users}
          label="Registered"
          value={registered}
          accent="text-rlc-accent"
          bg="bg-rlc-accent/10"
          subtitle="Total signups"
        />
        <CounterCard
          icon={UserCheck}
          label={day === 0 ? 'Entered (unique)' : `Entered Day ${day}`}
          value={entered}
          subValue={`${pct(entered, registered)}%`}
          accent="text-blue-400"
          bg="bg-blue-400/10"
          subtitle="of registered"
        />
        <CounterCard
          icon={UtensilsCrossed}
          label={day === 0 ? 'Food (all)' : `Food Day ${day}`}
          value={food}
          subValue={entered > 0 ? `${pct(food, entered)}%` : '—'}
          accent="text-amber-400"
          bg="bg-amber-400/10"
          subtitle="of entered"
        />
        <CounterCard
          icon={Gift}
          label="Gifts collected"
          value={gifts}
          subValue={`${pct(gifts, registered)}%`}
          accent="text-rlc-amber"
          bg="bg-rlc-amber/10"
          subtitle="of registered"
        />
      </div>

      {/* Day breakdown when 'Both' is selected */}
      {day === 0 && (
        <div className="bg-rlc-bg-card border border-rlc-border rounded-2xl p-5 mb-6">
          <h2 className="text-base font-semibold mb-4">Day-wise breakdown</h2>
          <div className="grid grid-cols-2 gap-4">
            <DayMini
              label="Day 1 — Sat 20 June"
              entered={stats!.entered_d1}
              food={stats!.food_d1}
              registered={registered}
            />
            <DayMini
              label="Day 2 — Sun 21 June"
              entered={stats!.entered_d2}
              food={stats!.food_d2}
              registered={registered}
            />
          </div>
        </div>
      )}

      {/* Entries by hour — only show if there's data */}
      {stats!.entries_by_hour.length > 0 && (
        <div className="bg-rlc-bg-card border border-rlc-border rounded-2xl p-5">
          <h2 className="text-base font-semibold mb-4">Entries today by hour (IST)</h2>
          <div className="flex items-end gap-1 h-32">
            {Array.from({ length: 24 }, (_, hr) => {
              const found = stats!.entries_by_hour.find(h => h.hour === hr);
              const count = found?.count || 0;
              const height = count > 0 ? Math.max(6, (count / maxHourCount) * 100) : 2;
              return (
                <div key={hr} className="flex-1 flex flex-col items-center gap-1" title={`${hr}:00 — ${count} entries`}>
                  <div
                    className={`w-full rounded-t transition-all ${count > 0 ? 'bg-rlc-accent' : 'bg-rlc-border'}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-rlc-muted">{hr.toString().padStart(2, '0')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats!.entries_by_hour.length === 0 && (
        <div className="bg-rlc-bg-card border border-rlc-border rounded-2xl p-5 text-center text-rlc-muted">
          <p className="text-sm">Hourly entry chart will appear here on event day.</p>
        </div>
      )}
    </AdminShell>
  );
}

function CounterCard({
  icon: Icon, label, value, subValue, accent, bg, subtitle,
}: {
  icon: any; label: string; value: number; subValue?: string;
  accent: string; bg: string; subtitle?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 border border-rlc-border ${bg}`}>
      <div className="flex items-center gap-2 text-rlc-muted text-xs uppercase tracking-wider mb-3">
        <Icon className={`w-4 h-4 ${accent}`} />
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${accent}`}>{value}</span>
        {subValue && <span className={`text-sm font-medium ${accent} opacity-70`}>{subValue}</span>}
      </div>
      {subtitle && <p className="text-xs text-rlc-muted mt-1">{subtitle}</p>}
    </div>
  );
}

function DayMini({ label, entered, food, registered }: { label: string; entered: number; food: number; registered: number }) {
  const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 100) : 0);
  return (
    <div className="border border-rlc-border rounded-xl p-4">
      <p className="text-xs uppercase tracking-wider text-rlc-muted mb-2">{label}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-rlc-muted">Entered</span>
          <span className="font-semibold">{entered} <span className="text-rlc-muted text-xs">({pct(entered, registered)}%)</span></span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-rlc-muted">Food</span>
          <span className="font-semibold">{food} <span className="text-rlc-muted text-xs">{entered > 0 ? `(${pct(food, entered)}%)` : ''}</span></span>
        </div>
      </div>
    </div>
  );
}
