'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Plus, Rocket, Square, Trash2, X, Loader2, BarChart3, Timer, Eye } from 'lucide-react';

const POLL_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'rating', label: 'Rating (1-5)' },
];

export default function PollsPage() {
  const [polls, setPolls] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, any[]>>({});
  const [editing, setEditing] = useState<any>(null);
  const [eventId, setEventId] = useState('');
  const [saving, setSaving] = useState(false);
  const [timerInput, setTimerInput] = useState(30);
  const sb = createClient();

  useEffect(() => {
    sb.from('events').select('id').limit(1).single().then(({ data }) => {
      if (data) { setEventId(data.id); loadPolls(data.id); }
    });
  }, []);

  const loadPolls = async (eid: string) => {
    const { data } = await sb.from('event_polls').select('*').eq('event_id', eid).order('created_at', { ascending: false });
    setPolls(data || []);
    const rMap: Record<string, any[]> = {};
    for (const p of (data || [])) {
      const { data: r } = await sb.from('event_poll_responses').select('response').eq('poll_id', p.id);
      rMap[p.id] = r || [];
    }
    setResponses(rMap);
  };

  // Auto-refresh while any poll is live
  useEffect(() => {
    const hasLive = polls.some(p => p.status === 'live');
    if (!hasLive || !eventId) return;
    const interval = setInterval(() => loadPolls(eventId), 3000);
    return () => clearInterval(interval);
  }, [polls, eventId]);

  const launchPoll = async (id: string) => {
    await sb.rpc('event_launch_poll', { p_poll_id: id, p_timer_seconds: timerInput });
    loadPolls(eventId);
  };

  const closePoll = async (id: string) => {
    await sb.rpc('event_close_poll', { p_poll_id: id });
    loadPolls(eventId);
  };

  const deletePoll = async (id: string) => {
    if (!confirm('Delete this poll and all responses?')) return;
    await sb.from('event_poll_responses').delete().eq('poll_id', id);
    await sb.from('event_polls').delete().eq('id', id);
    loadPolls(eventId);
  };

  const savePoll = async () => {
    if (!editing?.question?.trim()) return;
    if (editing.poll_type === 'multiple_choice' && (editing.options || []).some((o: any) => !o.label.trim())) return alert('Fill all options');
    setSaving(true);
    const opts = editing.poll_type === 'yes_no' ? [{ label: 'Yes' }, { label: 'No' }] :
      editing.poll_type === 'rating' ? [] : editing.options;
    const payload = {
      event_id: eventId, question: editing.question.trim(),
      poll_type: editing.poll_type || 'multiple_choice', options: opts,
      status: 'draft', show_results: false, timer_seconds: editing.timer_seconds || 30,
    };
    if (editing.id) { await sb.from('event_polls').update(payload).eq('id', editing.id); }
    else { await sb.from('event_polls').insert(payload); }
    setEditing(null); setSaving(false); loadPolls(eventId);
  };

  const getBarData = (poll: any) => {
    const resps = responses[poll.id] || [];
    const options = (poll.options || []) as { label: string }[];
    const counts: Record<string, number> = {};
    options.forEach(o => { counts[o.label] = 0; });
    resps.forEach(r => { const c = r.response?.choice; if (c && counts[c] !== undefined) counts[c]++; });
    const total = resps.length || 1;
    return { options: options.map(o => ({ label: o.label, count: counts[o.label] || 0, pct: Math.round(((counts[o.label] || 0) / total) * 100) })), total: resps.length };
  };

  const displayUrl = typeof window !== 'undefined' ? `${window.location.origin}/robolapcon-2026/live/display` : '';

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Polls</h1>
          <p className="text-sm text-rlc-muted">Create → Launch → Delegates vote → Results reveal</p>
        </div>
        <button onClick={() => setEditing({ question: '', poll_type: 'multiple_choice', options: [{ label: '' }, { label: '' }], timer_seconds: 30 })}
          className="rlc-btn-primary !py-2"><Plus className="w-4 h-4" /> New Poll</button>
      </div>

      {/* Projector link */}
      <div className="bg-rlc-bg-card border border-rlc-border rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Projector Display</p>
          <p className="text-xs text-rlc-muted">Open this URL on the conference projector/TV</p>
        </div>
        <button onClick={() => window.open(displayUrl, '_blank')} className="rlc-btn-outline !py-2 text-xs">
          <Eye className="w-4 h-4" /> Open Display
        </button>
      </div>

      <div className="space-y-4">
        {polls.map(p => {
          const isLive = p.status === 'live';
          const isClosed = p.status === 'closed';
          const isDraft = p.status === 'draft';
          const barData = getBarData(p);
          const elapsed = p.launched_at ? Math.floor((Date.now() - new Date(p.launched_at).getTime()) / 1000) : 0;
          const remaining = isLive ? Math.max(0, (p.timer_seconds || 30) - elapsed) : 0;

          return (
            <div key={p.id} className={`rlc-card ${isLive ? 'border-rlc-accent/50 ring-1 ring-rlc-accent/20' : ''}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{p.question}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isLive ? 'bg-rlc-accent/10 text-rlc-accent animate-pulse' : isClosed ? 'bg-rlc-muted/10 text-rlc-muted' : 'bg-rlc-amber/10 text-rlc-amber'
                    }`}>{isLive ? '● LIVE' : p.status}</span>
                    <span className="text-xs text-rlc-muted">{p.poll_type.replace('_', ' ')}</span>
                    <span className="text-xs text-rlc-accent font-medium">{barData.total} votes</span>
                    {isLive && remaining > 0 && (
                      <span className="text-xs text-rlc-amber font-mono flex items-center gap-1"><Timer className="w-3 h-3" />{remaining}s</span>
                    )}
                    {isLive && remaining <= 0 && (
                      <span className="text-xs text-rlc-red">Timer ended — close to reveal</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {isDraft && (
                    <div className="flex items-center gap-1">
                      <input type="number" value={timerInput} onChange={e => setTimerInput(Number(e.target.value))}
                        className="rlc-input !w-16 !py-1 text-xs text-center" min={10} max={120} />
                      <span className="text-xs text-rlc-muted">sec</span>
                      <button onClick={() => launchPoll(p.id)} className="rlc-btn-primary !py-1.5 !px-3 text-xs ml-2">
                        <Rocket className="w-3.5 h-3.5" /> Launch
                      </button>
                    </div>
                  )}
                  {isLive && (
                    <button onClick={() => closePoll(p.id)} className="rlc-btn-outline !py-1.5 !px-3 text-xs border-rlc-red/30 text-rlc-red hover:bg-rlc-red/10">
                      <Square className="w-3.5 h-3.5" /> Close & Reveal
                    </button>
                  )}
                  {!isLive && (
                    <button onClick={() => deletePoll(p.id)} className="p-2 rounded hover:bg-rlc-red/10 text-rlc-muted hover:text-rlc-red">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline results (always visible for admin) */}
              {(isLive || isClosed) && (p.poll_type === 'multiple_choice' || p.poll_type === 'yes_no') && (
                <div className="space-y-2 mt-3 pt-3 border-t border-rlc-border/50">
                  {barData.options.map((bar, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-sm">{bar.label}</span>
                        <span className="text-sm font-bold text-rlc-accent">{bar.pct}% ({bar.count})</span>
                      </div>
                      <div className="h-3 bg-rlc-bg-light rounded-full overflow-hidden">
                        <div className="h-full bg-rlc-accent rounded-full transition-all duration-700" style={{ width: `${Math.max(bar.pct, 1)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(isLive || isClosed) && p.poll_type === 'rating' && (() => {
                const resps = responses[p.id] || [];
                const avg = resps.length ? (resps.reduce((s, r) => s + (r.response?.rating || 0), 0) / resps.length).toFixed(1) : '0';
                return <div className="mt-3 pt-3 border-t border-rlc-border/50 text-center"><span className="text-3xl font-bold text-rlc-accent">{avg}</span><span className="text-rlc-muted"> / 5 ({resps.length} votes)</span></div>;
              })()}
            </div>
          );
        })}
        {polls.length === 0 && <p className="text-center text-rlc-muted py-12">No polls yet. Create one to engage your audience.</p>}
      </div>

      {/* Create/Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-rlc-bg-card border border-rlc-border rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between mb-5">
              <h2 className="text-lg font-bold">{editing.id ? 'Edit Poll' : 'New Poll'}</h2>
              <button onClick={() => setEditing(null)} className="text-rlc-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="rlc-label">Question</label>
                <input value={editing.question} onChange={e => setEditing((p: any) => ({ ...p, question: e.target.value }))} className="rlc-input" placeholder="What do you think about...?" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="rlc-label">Type</label>
                  <select value={editing.poll_type} onChange={e => {
                    const t = e.target.value;
                    const opts = t === 'yes_no' ? [{ label: 'Yes' }, { label: 'No' }] : t === 'rating' ? [] : editing.options.length >= 2 ? editing.options : [{ label: '' }, { label: '' }];
                    setEditing((p: any) => ({ ...p, poll_type: t, options: opts }));
                  }} className="rlc-select">
                    {POLL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select></div>
                <div><label className="rlc-label">Timer (seconds)</label>
                  <input type="number" value={editing.timer_seconds || 30} onChange={e => setEditing((p: any) => ({ ...p, timer_seconds: Number(e.target.value) }))} className="rlc-input" min={10} max={300} /></div>
              </div>
              {editing.poll_type === 'multiple_choice' && (
                <div><label className="rlc-label">Options</label>
                  {(editing.options || []).map((opt: any, i: number) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={opt.label} onChange={e => {
                        const opts = [...editing.options]; opts[i] = { ...opts[i], label: e.target.value };
                        setEditing((p: any) => ({ ...p, options: opts }));
                      }} className="rlc-input" placeholder={`Option ${i + 1}`} />
                      {editing.options.length > 2 && (
                        <button onClick={() => setEditing((p: any) => ({ ...p, options: p.options.filter((_: any, j: number) => j !== i) }))}
                          className="text-rlc-muted hover:text-rlc-red shrink-0"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  {editing.options.length < 6 && (
                    <button onClick={() => setEditing((p: any) => ({ ...p, options: [...p.options, { label: '' }] }))}
                      className="text-xs text-rlc-accent hover:underline">+ Add option</button>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-rlc-border">
              <button onClick={() => setEditing(null)} className="rlc-btn-outline !py-2">Cancel</button>
              <button onClick={savePoll} disabled={saving} className="rlc-btn-primary !py-2 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
