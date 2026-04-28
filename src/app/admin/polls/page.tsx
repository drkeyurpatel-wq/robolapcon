'use client';
import { useEffect, useState, useRef } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Plus, Rocket, Square, Trash2, X, Loader2, BarChart3, Clock, Users } from 'lucide-react';

const POLL_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'rating', label: 'Rating (1-5)' },
];

export default function PollsPage() {
  const [polls, setPolls] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<any>(null);
  const [eventId, setEventId] = useState('');
  const [eventSlug, setEventSlug] = useState('');
  const [duration, setDuration] = useState(30);
  const [liveCountdown, setLiveCountdown] = useState<Record<string, number>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sb = createClient();

  useEffect(() => {
    sb.from('events').select('id, slug').limit(1).single().then(({ data }) => {
      if (data) { setEventId(data.id); setEventSlug(data.slug); loadPolls(data.id); }
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Countdown ticker
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setLiveCountdown(prev => {
        const next: Record<string, number> = {};
        for (const p of polls) {
          if (p.status === 'live' && p.launched_at) {
            const elapsed = Math.floor((Date.now() - new Date(p.launched_at).getTime()) / 1000);
            const remaining = Math.max(0, (p.duration_seconds || 30) - elapsed);
            next[p.id] = remaining;
            // Auto-close when timer hits 0
            if (remaining === 0) {
              sb.rpc('event_close_poll', { p_poll_id: p.id }).then(() => loadPolls(eventId));
            }
          }
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [polls, eventId]);

  // Realtime response counter
  useEffect(() => {
    if (!eventId) return;
    const ch = sb.channel('admin-poll-responses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_poll_responses' },
        () => loadResponses())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [eventId]);

  const loadPolls = async (eid: string) => {
    const { data } = await sb.rpc('rlc_admin_polls', { p_event_id: eid });
    setPolls(data || []);
    loadResponsesFor(data || []);
  };

  const loadResponses = async () => {
    loadResponsesFor(polls);
  };

  const loadResponsesFor = async (pollList: any[]) => {
    const rMap: Record<string, number> = {};
    for (const p of pollList) {
      const { count } = await sb.from('event_poll_responses').select('*', { count: 'exact', head: true }).eq('poll_id', p.id);
      rMap[p.id] = count || 0;
    }
    setResponses(rMap);
  };

  const launchPoll = async (id: string) => {
    await sb.rpc('event_launch_poll', { p_poll_id: id, p_duration: duration });
    loadPolls(eventId);
  };

  const closePoll = async (id: string) => {
    await sb.rpc('event_close_poll', { p_poll_id: id });
    loadPolls(eventId);
  };

  const deletePoll = async (id: string) => {
    if (!confirm('Delete this poll and all responses?')) return;
    await sb.rpc('rlc_admin_delete_poll', { p_id: id });
    loadPolls(eventId);
  };

  const savePoll = async () => {
    if (!editing?.question?.trim()) return;
    const opts = (editing.options || []).filter((o: any) => o.label?.trim());
    if (editing.poll_type === 'multiple_choice' && opts.length < 2) return alert('Need at least 2 options');
    const finalOpts = editing.poll_type === 'yes_no' ? [{ label: 'Yes' }, { label: 'No' }] : opts;

    if (editing.id) {
      await sb.rpc('rlc_admin_update_poll', {
        p_id: editing.id,
        p_question: editing.question.trim(),
        p_poll_type: editing.poll_type || 'multiple_choice',
        p_options: finalOpts,
      });
    } else {
      await sb.rpc('rlc_admin_create_poll', {
        p_event_id: eventId,
        p_question: editing.question.trim(),
        p_poll_type: editing.poll_type || 'multiple_choice',
        p_options: finalOpts,
      });
    }
    setEditing(null);
    loadPolls(eventId);
  };

  const livePoll = polls.find(p => p.status === 'live');
  const draftPolls = polls.filter(p => p.status === 'draft');
  const closedPolls = polls.filter(p => p.status === 'closed');

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Polls</h1>
          {eventSlug && <p className="text-xs text-rlc-muted mt-1">Display: <a href={`/${eventSlug}/live/display`} target="_blank" className="text-rlc-accent hover:underline">/{eventSlug}/live/display</a></p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-rlc-muted">
            <Clock className="w-4 h-4" />
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="rlc-select !w-auto !py-1 text-xs">
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={45}>45s</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
            </select>
          </div>
          <button onClick={() => setEditing({ question: '', poll_type: 'multiple_choice', options: [{ label: '' }, { label: '' }] })}
            className="rlc-btn-primary !py-2"><Plus className="w-4 h-4" /> New Poll</button>
        </div>
      </div>

      {/* LIVE POLL — prominent */}
      {livePoll && (
        <div className="rlc-card border-rlc-accent/50 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-rlc-red animate-pulse" />
            <span className="text-xs font-bold text-rlc-accent uppercase tracking-widest">LIVE NOW</span>
            <span className="ml-auto text-3xl font-black text-rlc-accent tabular-nums">
              {liveCountdown[livePoll.id] ?? '—'}s
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{livePoll.question}</h2>
          <div className="flex items-center gap-4 mb-4">
            <span className="flex items-center gap-1 text-sm text-rlc-muted">
              <Users className="w-4 h-4" /> {responses[livePoll.id] || 0} responses
            </span>
            <span className="text-sm text-rlc-muted">{livePoll.poll_type.replace('_', ' ')}</span>
          </div>
          <button onClick={() => closePoll(livePoll.id)} className="rlc-btn-amber !py-3 w-full">
            <Square className="w-5 h-5" /> Close & Reveal Results
          </button>
        </div>
      )}

      {/* DRAFT POLLS — ready to launch */}
      {draftPolls.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-rlc-muted uppercase tracking-widest mb-3">Ready to Launch</h3>
          <div className="space-y-2">
            {draftPolls.map(p => (
              <div key={p.id} className="rlc-card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm">{p.question}</h3>
                  <span className="text-xs text-rlc-muted">{p.poll_type.replace('_', ' ')} · {(p.options || []).length} options</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => launchPoll(p.id)} className="rlc-btn-primary !py-2 !px-4" title="Launch">
                    <Rocket className="w-4 h-4" /> Launch
                  </button>
                  <button onClick={() => setEditing({ ...p })} className="p-2 rounded hover:bg-white/5 text-rlc-muted hover:text-white">
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deletePoll(p.id)} className="p-2 rounded hover:bg-rlc-red/10 text-rlc-muted hover:text-rlc-red">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLOSED POLLS */}
      {closedPolls.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-rlc-muted uppercase tracking-widest mb-3">Completed</h3>
          <div className="space-y-2">
            {closedPolls.map(p => (
              <div key={p.id} className="rlc-card flex items-center gap-4 opacity-60">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm">{p.question}</h3>
                  <span className="text-xs text-rlc-muted">{responses[p.id] || 0} responses</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => launchPoll(p.id)} className="p-2 rounded hover:bg-white/5 text-rlc-muted hover:text-rlc-accent" title="Re-launch">
                    <Rocket className="w-4 h-4" />
                  </button>
                  <button onClick={() => deletePoll(p.id)} className="p-2 rounded hover:bg-rlc-red/10 text-rlc-muted hover:text-rlc-red">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {polls.length === 0 && <p className="text-center text-rlc-muted py-12">No polls yet. Create one to engage your audience.</p>}

      {/* CREATE/EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-rlc-bg-card border border-rlc-border rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between mb-5">
              <h2 className="text-lg font-bold">{editing.id ? 'Edit' : 'New'} Poll</h2>
              <button onClick={() => setEditing(null)} className="text-rlc-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="rlc-label">Question</label>
                <input value={editing.question} onChange={e => setEditing((p: any) => ({ ...p, question: e.target.value }))} className="rlc-input" placeholder="What approach would you prefer for this case?" autoFocus /></div>
              <div><label className="rlc-label">Type</label>
                <select value={editing.poll_type} onChange={e => {
                  const t = e.target.value;
                  setEditing((p: any) => ({ ...p, poll_type: t, options: t === 'yes_no' ? [{ label: 'Yes' }, { label: 'No' }] : t === 'rating' ? [] : p.options }));
                }} className="rlc-select">{POLL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              {editing.poll_type === 'multiple_choice' && (
                <div><label className="rlc-label">Options</label>
                  {(editing.options || []).map((opt: any, i: number) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={opt.label} onChange={e => { const o = [...editing.options]; o[i] = { ...o[i], label: e.target.value }; setEditing((p: any) => ({ ...p, options: o })); }} className="rlc-input" placeholder={`Option ${i + 1}`} />
                      {editing.options.length > 2 && <button onClick={() => setEditing((p: any) => ({ ...p, options: p.options.filter((_: any, j: number) => j !== i) }))} className="text-rlc-muted hover:text-rlc-red"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                  {editing.options.length < 6 && <button onClick={() => setEditing((p: any) => ({ ...p, options: [...p.options, { label: '' }] }))} className="text-xs text-rlc-accent hover:underline">+ Add option</button>}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-rlc-border">
              <button onClick={() => setEditing(null)} className="rlc-btn-outline !py-2">Cancel</button>
              <button onClick={savePoll} className="rlc-btn-primary !py-2">Save as Draft</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
