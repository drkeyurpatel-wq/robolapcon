'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Send, Trash2, Radio } from 'lucide-react';

export default function LiveAdminPage() {
  const [eventId, setEventId] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [updates, setUpdates] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [updateType, setUpdateType] = useState('commentary');
  const [authorName, setAuthorName] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const sb = createClient();

  useEffect(() => {
    sb.from('events').select('id').limit(1).single().then(({ data }) => {
      if (!data) return;
      setEventId(data.id);
      sb.rpc('rlc_admin_sessions', { p_event_id: data.id }).then(({ data: s }) => {
        setSessions((s || []).filter((x: any) => x.type === 'live_surgery'));
      });
      loadData(data.id);
    });
  }, []);

  const loadData = async (eid: string) => {
    const { data: u } = await sb.rpc('rlc_admin_live_updates', { p_event_id: eid });
    setUpdates(u || []);
    const { data: q } = await sb.rpc('rlc_admin_qa', { p_event_id: eid });
    setQuestions(q || []);
  };

  const postUpdate = async () => {
    if (!content.trim() || !eventId) return;
    await sb.rpc('rlc_admin_post_update', {
      p_event_id: eventId,
      p_content: content.trim(),
      p_author_name: authorName.trim() || null,
      p_update_type: updateType,
      p_session_id: selectedSession || null,
    });
    setContent('');
    loadData(eventId);
  };

  const deleteUpdate = async (id: string) => {
    await sb.rpc('rlc_admin_delete_update', { p_id: id });
    loadData(eventId);
  };

  const approveQuestion = async (id: string, approved: boolean) => {
    await sb.rpc('rlc_admin_moderate_qa', { p_id: id, p_approved: approved });
    loadData(eventId);
  };

  const pinQuestion = async (id: string, pinned: boolean) => {
    await sb.rpc('rlc_admin_pin_qa', { p_id: id, p_pinned: pinned });
    loadData(eventId);
  };

  const markAnswered = async (id: string) => {
    await sb.rpc('rlc_admin_answer_qa', { p_id: id });
    loadData(eventId);
  };

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold mb-6">Live Commentary & Q&A</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Radio className="w-4 h-4 text-rlc-accent" /> Post Commentary</h2>
          <div className="space-y-3 mb-4">
            <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className="rlc-select">
              <option value="">General</option>
              {sessions.map((s: any) => <option key={s.id} value={s.id}>D{s.day_number}: {s.title}</option>)}
            </select>
            <div className="flex gap-2">
              <input value={authorName} onChange={e => setAuthorName(e.target.value)} className="rlc-input !w-1/3" placeholder="Author" />
              <select value={updateType} onChange={e => setUpdateType(e.target.value)} className="rlc-select !w-1/3">
                <option value="commentary">Commentary</option>
                <option value="milestone">Milestone</option>
                <option value="alert">Alert</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input value={content} onChange={e => setContent(e.target.value)} className="rlc-input flex-1"
                placeholder="Now dissecting the renal hilum..." onKeyDown={e => e.key === 'Enter' && postUpdate()} />
              <button onClick={postUpdate} className="rlc-btn-primary !py-2 !px-4"><Send className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {updates.map((u: any) => (
              <div key={u.id} className="rlc-card !p-3 flex justify-between items-start">
                <div>
                  <p className="text-sm text-white">{u.content}</p>
                  <p className="text-xs text-rlc-muted">{u.author_name} · {new Date(u.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button onClick={() => deleteUpdate(u.id)} className="text-rlc-muted hover:text-rlc-red shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {updates.length === 0 && <p className="text-sm text-rlc-muted py-4 text-center">No updates posted yet.</p>}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">Q&A Moderation</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {questions.map((q: any) => (
              <div key={q.id} className={`rlc-card !p-3 ${!q.is_approved ? 'border-rlc-amber/30' : ''}`}>
                <p className="text-sm text-white">{q.question_text}</p>
                <p className="text-xs text-rlc-muted mt-1">{q.delegate_name} · {q.upvote_count} votes</p>
                <div className="flex gap-2 mt-2">
                  {!q.is_approved ? (
                    <button onClick={() => approveQuestion(q.id, true)} className="text-xs text-rlc-accent hover:underline">Approve</button>
                  ) : (
                    <button onClick={() => approveQuestion(q.id, false)} className="text-xs text-rlc-muted hover:underline">Hide</button>
                  )}
                  <button onClick={() => pinQuestion(q.id, !q.is_pinned)} className={`text-xs ${q.is_pinned ? 'text-rlc-amber' : 'text-rlc-muted'} hover:underline`}>
                    {q.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                  {!q.is_answered && <button onClick={() => markAnswered(q.id)} className="text-xs text-rlc-muted hover:underline">Mark Answered</button>}
                  {q.is_answered && <span className="text-xs text-rlc-accent">✓ Answered</span>}
                </div>
              </div>
            ))}
            {questions.length === 0 && <p className="text-center text-rlc-muted py-8">No questions yet.</p>}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
