'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Plus, Play, Square, Eye, EyeOff, Trash2, X, Loader2 } from 'lucide-react';

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
  const sb = createClient();

  useEffect(() => {
    sb.from('events').select('id').limit(1).single().then(({ data }) => {
      if (data) { setEventId(data.id); loadPolls(data.id); }
    });
  }, []);

  const loadPolls = async (eid: string) => {
    const { data } = await sb.from('event_polls').select('*').eq('event_id', eid).order('created_at', { ascending: false });
    setPolls(data || []);
    const rMap: Record<string, number> = {};
    for (const p of (data || [])) {
      const { count } = await sb.from('event_poll_responses').select('*', { count: 'exact', head: true }).eq('poll_id', p.id);
      rMap[p.id] = count || 0;
    }
    setResponses(rMap);
  };

  const setStatus = async (id: string, status: string) => {
    await sb.from('event_polls').update({ status }).eq('id', id);
    loadPolls(eventId);
  };

  const toggleResults = async (id: string, show: boolean) => {
    await sb.from('event_polls').update({ show_results: show }).eq('id', id);
    loadPolls(eventId);
  };

  const deletePoll = async (id: string) => {
    if (!confirm('Delete this poll?')) return;
    await sb.from('event_poll_responses').delete().eq('poll_id', id);
    await sb.from('event_polls').delete().eq('id', id);
    loadPolls(eventId);
  };

  const savePoll = async () => {
    if (!editing?.question?.trim()) return;
    const payload = {
      event_id: eventId,
      question: editing.question.trim(),
      poll_type: editing.poll_type || 'multiple_choice',
      options: editing.options || [],
      status: editing.status || 'draft',
      show_results: editing.show_results || false,
    };
    if (editing.id) { await sb.from('event_polls').update(payload).eq('id', editing.id); }
    else { await sb.from('event_polls').insert(payload); }
    setEditing(null);
    loadPolls(eventId);
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Polls & Q&A</h1>
        <button onClick={() => setEditing({ question: '', poll_type: 'multiple_choice', options: [{ label: '' }, { label: '' }], status: 'draft', show_results: false })}
          className="rlc-btn-primary !py-2"><Plus className="w-4 h-4" /> New Poll</button>
      </div>

      <div className="space-y-3">
        {polls.map(p => (
          <div key={p.id} className="rlc-card flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm">{p.question}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  p.status === 'live' ? 'bg-rlc-accent/10 text-rlc-accent' :
                  p.status === 'closed' ? 'bg-rlc-muted/10 text-rlc-muted' :
                  'bg-rlc-amber/10 text-rlc-amber'
                }`}>{p.status}</span>
                <span className="text-xs text-rlc-muted">{p.poll_type.replace('_', ' ')}</span>
                <span className="text-xs text-rlc-accent font-medium">{responses[p.id] || 0} responses</span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {p.status === 'draft' && <button onClick={() => setStatus(p.id, 'live')} className="p-2 rounded hover:bg-rlc-accent/10 text-rlc-muted hover:text-rlc-accent" title="Go Live"><Play className="w-4 h-4" /></button>}
              {p.status === 'live' && <button onClick={() => setStatus(p.id, 'closed')} className="p-2 rounded hover:bg-rlc-red/10 text-rlc-muted hover:text-rlc-red" title="Close"><Square className="w-4 h-4" /></button>}
              <button onClick={() => toggleResults(p.id, !p.show_results)} className={`p-2 rounded hover:bg-white/5 ${p.show_results ? 'text-rlc-accent' : 'text-rlc-muted'}`} title={p.show_results ? 'Hide from screen' : 'Show on screen'}>
                {p.show_results ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => deletePoll(p.id)} className="p-2 rounded hover:bg-rlc-red/10 text-rlc-muted hover:text-rlc-red"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {polls.length === 0 && <p className="text-center text-rlc-muted py-8">No polls yet. Create one to engage your audience.</p>}
      </div>

      {/* Edit Modal */}
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
              <div><label className="rlc-label">Type</label>
                <select value={editing.poll_type} onChange={e => {
                  const type = e.target.value;
                  const opts = type === 'yes_no' ? [{ label: 'Yes' }, { label: 'No' }] :
                    type === 'rating' ? [] : editing.options;
                  setEditing((p: any) => ({ ...p, poll_type: type, options: opts }));
                }} className="rlc-select">
                  {POLL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select></div>
              {(editing.poll_type === 'multiple_choice') && (
                <div><label className="rlc-label">Options</label>
                  {(editing.options || []).map((opt: any, i: number) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={opt.label} onChange={e => {
                        const opts = [...editing.options]; opts[i] = { ...opts[i], label: e.target.value };
                        setEditing((p: any) => ({ ...p, options: opts }));
                      }} className="rlc-input" placeholder={`Option ${i + 1}`} />
                      {editing.options.length > 2 && (
                        <button onClick={() => setEditing((p: any) => ({ ...p, options: p.options.filter((_: any, j: number) => j !== i) }))}
                          className="text-rlc-muted hover:text-rlc-red"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setEditing((p: any) => ({ ...p, options: [...p.options, { label: '' }] }))}
                    className="text-xs text-rlc-accent hover:underline">+ Add option</button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-rlc-border">
              <button onClick={() => setEditing(null)} className="rlc-btn-outline !py-2">Cancel</button>
              <button onClick={savePoll} className="rlc-btn-primary !py-2">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
