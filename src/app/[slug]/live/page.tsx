'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, BarChart3, Send, ThumbsUp, Radio, ChevronUp } from 'lucide-react';

export default function LivePage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [event, setEvent] = useState<any>(null);
  const [tab, setTab] = useState<'polls' | 'qa' | 'feed'>('polls');
  const [delegateId, setDelegateId] = useState('');
  const [delegateName, setDelegateName] = useState('');
  const [identified, setIdentified] = useState(false);
  const [showPhoneFallback, setShowPhoneFallback] = useState(false);
  const [phone, setPhone] = useState('');

  // Polls
  const [polls, setPolls] = useState<any[]>([]);
  const [myResponses, setMyResponses] = useState<Set<string>>(new Set());
  const [submittingPoll, setSubmittingPoll] = useState('');

  // Q&A
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());

  // Commentary
  const [updates, setUpdates] = useState<any[]>([]);

  const sb = createClient();

  // Auto-identify: URL param → localStorage → fallback
  useEffect(() => {
    const identify = async (id: string) => {
      const { data } = await sb.rpc('rlc_lookup_delegate', { p_delegate_id: id });
      const result = data as any;
      if (result?.success) {
        setDelegateId(result.id);
        setDelegateName(result.full_name);
        setIdentified(true);
        try { localStorage.setItem('rlc_delegate', JSON.stringify({ id: result.id, name: result.full_name })); } catch {}
        return true;
      }
      return false;
    };

    const tryAutoIdentify = async () => {
      // 1. URL param ?d=uuid
      const paramId = searchParams?.get('d');
      if (paramId) {
        const ok = await identify(paramId);
        if (ok) return;
      }

      // 2. localStorage
      try {
        const saved = localStorage.getItem('rlc_delegate');
        if (saved) {
          const { id, name } = JSON.parse(saved);
          if (id && name) {
            setDelegateId(id);
            setDelegateName(name);
            setIdentified(true);
            return;
          }
        }
      } catch {}

      // 3. Nothing found — show phone fallback
      setShowPhoneFallback(true);
    };

    tryAutoIdentify();
  }, []);

  // Phone fallback handler
  const handleIdentify = async () => {
    if (!phone.trim()) return;
    const { data } = await sb.rpc('rlc_lookup_by_phone', { p_phone: phone.trim() });
    const result = data as any;
    if (result?.success && result?.id) {
      setDelegateId(result.id);
      setDelegateName(result.full_name);
      setIdentified(true);
      setShowPhoneFallback(false);
      try { localStorage.setItem('rlc_delegate', JSON.stringify({ id: result.id, name: result.full_name })); } catch {}
    } else {
      alert('Phone not found. Please register first.');
    }
  };

  // Load event + data
  useEffect(() => {
    sb.rpc('get_event_by_slug', { p_slug: slug }).then(({ data }) => {
      if (data) setEvent(data);
    });
  }, [slug]);

  useEffect(() => {
    if (!event) return;
    const eid = event.id;

    // Load polls
    sb.from('event_polls').select('*').eq('event_id', eid).eq('status', 'live')
      .order('display_order').then(({ data }) => setPolls(data || []));

    // Load Q&A
    sb.from('event_qa').select('*').eq('event_id', eid).eq('is_approved', true)
      .order('upvote_count', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => setQuestions(data || []));

    // Load commentary
    sb.from('event_live_updates').select('*').eq('event_id', eid)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setUpdates(data || []));

    // Realtime subscriptions
    const pollCh = sb.channel('polls-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_polls', filter: `event_id=eq.${eid}` },
        () => {
          sb.from('event_polls').select('*').eq('event_id', eid).eq('status', 'live').order('display_order').then(({ data }) => {
            setPolls(data || []);
            // Auto-switch to polls tab when a poll goes live
            if (data && data.length > 0) setTab('polls');
          });
        })
      .subscribe();

    const qaCh = sb.channel('qa-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_qa', filter: `event_id=eq.${eid}` },
        () => { sb.from('event_qa').select('*').eq('event_id', eid).eq('is_approved', true).order('upvote_count', { ascending: false }).then(({ data }) => setQuestions(data || [])); })
      .subscribe();

    const feedCh = sb.channel('feed-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_live_updates', filter: `event_id=eq.${eid}` },
        (payload) => { setUpdates(prev => [payload.new as any, ...prev]); })
      .subscribe();

    return () => { sb.removeChannel(pollCh); sb.removeChannel(qaCh); sb.removeChannel(feedCh); };
  }, [event]);

  // Load my responses
  useEffect(() => {
    if (!delegateId || polls.length === 0) return;
    sb.from('event_poll_responses').select('poll_id').eq('delegate_id', delegateId)
      .then(({ data }) => { setMyResponses(new Set((data || []).map((r: any) => r.poll_id))); });
  }, [delegateId, polls]);

  const submitPollResponse = async (pollId: string, response: any) => {
    if (!delegateId) return;
    setSubmittingPoll(pollId);
    await sb.rpc('event_submit_poll_response', { p_poll_id: pollId, p_delegate_id: delegateId, p_response: response });
    setMyResponses(prev => new Set(prev).add(pollId));
    setSubmittingPoll('');
  };

  // Tick timer every second (forces re-render for countdown)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const hasLive = polls.some(p => p.status === 'live');
    if (!hasLive) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [polls]);

  const submitQuestion = async () => {
    if (!newQuestion.trim() || !delegateId || !event) return;
    setSubmittingQ(true);
    await sb.rpc('event_submit_question', {
      p_event_id: event.id, p_delegate_id: delegateId,
      p_delegate_name: delegateName, p_question: newQuestion.trim()
    });
    setNewQuestion('');
    setSubmittingQ(false);
  };

  const upvoteQuestion = async (qId: string) => {
    if (!delegateId || myUpvotes.has(qId)) return;
    setMyUpvotes(prev => new Set(prev).add(qId));
    await sb.rpc('event_upvote_question', { p_question_id: qId, p_delegate_id: delegateId });
  };

  if (!event) return <div className="min-h-screen flex items-center justify-center text-rlc-muted">Loading...</div>;

  if (!identified && !showPhoneFallback) return <div className="min-h-screen flex items-center justify-center text-rlc-muted">Connecting...</div>;

  if (!identified && showPhoneFallback) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-rlc-accent/10 flex items-center justify-center mb-4">
            <Radio className="w-7 h-7 text-rlc-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-1">{event.name}</h1>
          <p className="text-sm text-rlc-muted mb-6">Enter your registered phone to join</p>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="rlc-input mb-3" placeholder="+91 98765 43210"
            onKeyDown={e => e.key === 'Enter' && handleIdentify()} />
          <button onClick={handleIdentify} className="rlc-btn-primary w-full !py-3">Join Live</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-rlc-bg/95 backdrop-blur-xl border-b border-rlc-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rlc-red animate-pulse" />
              <span className="text-sm font-bold">{event.name} — LIVE</span>
            </div>
            <p className="text-xs text-rlc-muted">Welcome, {delegateName}</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex border-t border-rlc-border">
          {([['polls', BarChart3, 'Polls'], ['qa', MessageSquare, 'Q&A'], ['feed', Radio, 'Live Feed']] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${tab === key ? 'text-rlc-accent border-b-2 border-rlc-accent' : 'text-rlc-muted'}`}>
              <Icon className="w-4 h-4" />{label}
              {key === 'polls' && polls.length > 0 && <span className="w-4 h-4 rounded-full bg-rlc-accent text-white text-[10px] flex items-center justify-center">{polls.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* POLLS TAB */}
        {tab === 'polls' && (
          <div className="space-y-4">
            {polls.length === 0 && <p className="text-center text-rlc-muted py-12">No active polls right now. Stay tuned!</p>}
            {polls.map(poll => {
              const answered = myResponses.has(poll.id);
              const options = (poll.options || []) as { label: string }[];
              const elapsed = poll.launched_at ? Math.floor((Date.now() - new Date(poll.launched_at).getTime()) / 1000) : 0;
              const remaining = Math.max(0, (poll.duration_seconds || 30) - elapsed);
              const timerPct = remaining / (poll.duration_seconds || 30) * 100;
              const expired = remaining <= 0;

              return (
                <div key={poll.id} className="rlc-card">
                  {/* Timer bar */}
                  {!expired && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 bg-rlc-bg-light rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${remaining <= 5 ? 'bg-rlc-red' : remaining <= 10 ? 'bg-rlc-amber' : 'bg-rlc-accent'}`}
                          style={{ width: `${timerPct}%` }} />
                      </div>
                      <span className={`text-xs font-mono font-bold ${remaining <= 5 ? 'text-rlc-red animate-pulse' : 'text-rlc-muted'}`}>{remaining}s</span>
                    </div>
                  )}
                  {expired && !answered && <p className="text-xs text-rlc-red mb-2">⏰ Time&apos;s up!</p>}

                  <h3 className="font-semibold text-white mb-3">{poll.question}</h3>

                  {(poll.poll_type === 'multiple_choice' || poll.poll_type === 'yes_no') ? (
                    <div className="space-y-2">
                      {options.map((opt, i) => (
                        <button key={i} disabled={answered || submittingPoll === poll.id || expired}
                          onClick={() => submitPollResponse(poll.id, { choice: opt.label })}
                          className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                            answered ? 'bg-rlc-accent/10 text-rlc-accent border border-rlc-accent/20' :
                            expired ? 'bg-rlc-bg-light text-rlc-muted/50 cursor-not-allowed' :
                            'bg-rlc-bg-light hover:bg-rlc-accent/20 hover:text-rlc-accent active:scale-[0.98] cursor-pointer border border-transparent hover:border-rlc-accent/30'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : poll.poll_type === 'rating' ? (
                    <div className="flex gap-3 justify-center py-2">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} disabled={answered || expired} onClick={() => submitPollResponse(poll.id, { rating: n })}
                          className={`w-14 h-14 rounded-2xl text-xl font-bold transition-all ${
                            answered ? 'bg-rlc-accent/10 text-rlc-accent' :
                            expired ? 'bg-rlc-bg-light text-rlc-muted/50' :
                            'bg-rlc-bg-light hover:bg-rlc-accent hover:text-white active:scale-95'
                          }`}>{n}</button>
                      ))}
                    </div>
                  ) : null}

                  {answered && (
                    <div className="mt-3 pt-2 border-t border-rlc-border/30 text-center">
                      <p className="text-xs text-rlc-accent">✓ Vote recorded — results on screen soon</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Q&A TAB */}
        {tab === 'qa' && (
          <div>
            {/* Submit question */}
            <div className="flex gap-2 mb-6">
              <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                className="rlc-input flex-1" placeholder="Ask a question..."
                onKeyDown={e => e.key === 'Enter' && submitQuestion()} />
              <button onClick={submitQuestion} disabled={submittingQ || !newQuestion.trim()}
                className="rlc-btn-primary !py-2 !px-4 disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
            {/* Questions list */}
            <div className="space-y-3">
              {questions.length === 0 && <p className="text-center text-rlc-muted py-8">No questions yet. Be the first to ask!</p>}
              {questions.map(q => (
                <div key={q.id} className="rlc-card !p-4 flex gap-3">
                  <button onClick={() => upvoteQuestion(q.id)}
                    className={`flex flex-col items-center shrink-0 ${myUpvotes.has(q.id) ? 'text-rlc-accent' : 'text-rlc-muted hover:text-rlc-accent'}`}>
                    <ChevronUp className="w-5 h-5" />
                    <span className="text-xs font-bold">{q.upvote_count}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{q.question_text}</p>
                    <p className="text-xs text-rlc-muted mt-1">{q.delegate_name || 'Anonymous'}</p>
                  </div>
                  {q.is_answered && <span className="text-xs text-rlc-accent shrink-0">✓ Answered</span>}
                  {q.is_pinned && <span className="text-xs text-rlc-amber shrink-0">📌</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIVE FEED TAB */}
        {tab === 'feed' && (
          <div className="space-y-3">
            {updates.length === 0 && <p className="text-center text-rlc-muted py-12">Live commentary will appear here during surgeries.</p>}
            {updates.map(u => (
              <div key={u.id} className={`rlc-card !p-4 ${u.is_pinned ? 'border-rlc-accent/50' : ''} ${u.update_type === 'milestone' ? 'border-rlc-amber/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    u.update_type === 'milestone' ? 'bg-rlc-amber' : u.update_type === 'alert' ? 'bg-rlc-red' : 'bg-rlc-accent'
                  }`} />
                  <div>
                    <p className="text-sm text-white">{u.content}</p>
                    <p className="text-xs text-rlc-muted mt-1">
                      {u.author_name && `${u.author_name} · `}
                      {new Date(u.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
