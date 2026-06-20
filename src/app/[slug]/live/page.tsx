'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, BarChart3, Send, ThumbsUp, Radio, ChevronUp } from 'lucide-react';

const RESULT_COLORS = ['#00A99D', '#FDB913', '#E31E24', '#6366f1', '#ec4899', '#14b8a6'];

export default function LivePage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [event, setEvent] = useState<any>(null);
  const [tab, setTab] = useState<'polls' | 'qa'>('polls');
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

  // Poll results
  const [pollResults, setPollResults] = useState<Record<string, any>>({});

  // Track the most recent live poll so we can show its results after it closes
  const lastLivePollIdRef = useRef<string | null>(null);

  const sb = createClient();

  // Auto-identify: URL param -> localStorage -> fallback
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

      // 3. Nothing found - show phone fallback
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

  // Load event
  useEffect(() => {
    sb.rpc('get_event_by_slug', { p_slug: slug }).then(({ data }) => {
      if (data) setEvent(data);
    });
  }, [slug]);

  // Load + track the active poll.
  // IMPORTANT: resolve the live poll the SAME way the display screen does, via
  // event_get_live_poll (status='live' ORDER BY launched_at DESC). The previous
  // approach ordered by updated_at, which is never bumped on launch/close, so the
  // phone never followed the live poll. Realtime is a booster; the 2s interval is
  // the safety net for flaky conference wifi / backgrounded tabs.
  useEffect(() => {
    if (!event) return;
    const eid = event.id;

    const loadActivePoll = async () => {
      const { data } = await sb.rpc('event_get_live_poll', { p_event_id: eid });
      const live = data as any;

      if (live?.id) {
        // A poll is live -> show it for voting.
        lastLivePollIdRef.current = live.id;
        setPolls([live]);
        setPollResults({});
        return;
      }

      // No live poll. If one just closed, show its results.
      const lastId = lastLivePollIdRef.current;
      if (lastId) {
        const { data: r } = await sb.rpc('event_get_poll_results', { p_poll_id: lastId });
        const res = r as any;
        if (res?.success && res?.show_results) {
          setPolls([{
            id: lastId,
            status: 'closed',
            question: res.question,
            poll_type: res.poll_type,
            options: res.options,
          }]);
          setPollResults({ [lastId]: res });
          return;
        }
      }

      // Nothing live and nothing to reveal.
      setPolls([]);
    };

    loadActivePoll();
    const pollInterval = setInterval(loadActivePoll, 2000);

    // Load Q&A
    sb.from('event_qa').select('*').eq('event_id', eid).eq('is_approved', true)
      .order('upvote_count', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => setQuestions(data || []));

    // Load commentary
    sb.from('event_live_updates').select('*').eq('event_id', eid)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setUpdates(data || []));

    // Realtime subscriptions (booster on top of the 2s poll)
    const pollCh = sb.channel('polls-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_polls', filter: `event_id=eq.${eid}` },
        loadActivePoll)
      .subscribe();

    const qaCh = sb.channel('qa-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_qa', filter: `event_id=eq.${eid}` },
        () => { sb.from('event_qa').select('*').eq('event_id', eid).eq('is_approved', true).order('upvote_count', { ascending: false }).then(({ data }) => setQuestions(data || [])); })
      .subscribe();

    const feedCh = sb.channel('feed-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_live_updates', filter: `event_id=eq.${eid}` },
        (payload) => { setUpdates(prev => [payload.new as any, ...prev]); })
      .subscribe();

    return () => { clearInterval(pollInterval); sb.removeChannel(pollCh); sb.removeChannel(qaCh); sb.removeChannel(feedCh); };
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
          {([['polls', BarChart3, 'Polls'], ['qa', MessageSquare, 'Q&A']] as const).map(([key, Icon, label]) => (
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
              const isClosed = poll.status === 'closed';
              const elapsed = poll.launched_at ? Math.floor((Date.now() - new Date(poll.launched_at).getTime()) / 1000) : 0;
              const remaining = isClosed ? 0 : Math.max(0, (poll.duration_seconds || 30) - elapsed);
              const timerPct = remaining / (poll.duration_seconds || 30) * 100;
              const expired = remaining <= 0;
              const results = pollResults[poll.id];

              // CLOSED POLL — show results bar chart
              if (isClosed && results) {
                const resultData = (results.results || []) as { choice: string; count: number }[];
                const total = results.total || 1;
                const bars = options.map((o, i) => {
                  const r = resultData.find((rd: any) => rd.choice === o.label);
                  const count = r?.count || 0;
                  const pct = Math.round((count / total) * 100);
                  return { label: o.label, count, pct, color: RESULT_COLORS[i % RESULT_COLORS.length] };
                });

                return (
                  <div key={poll.id} className="rlc-card">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-rlc-muted uppercase tracking-wider">Results</span>
                      <span className="text-xs text-rlc-muted ml-auto">{results.total} votes</span>
                    </div>
                    <h3 className="font-semibold text-white mb-4">{poll.question}</h3>
                    <div className="space-y-3">
                      {bars.map((bar, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-rlc-muted">{bar.label}</span>
                            <span className="font-bold" style={{ color: bar.color }}>{bar.pct}%</span>
                          </div>
                          <div className="h-7 bg-rlc-bg-light rounded-lg overflow-hidden">
                            <div className="h-full rounded-lg flex items-center pl-3 transition-all duration-1000"
                              style={{ width: `${Math.max(bar.pct, 3)}%`, backgroundColor: bar.color }}>
                              <span className="text-xs font-medium text-white/80">{bar.count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // LIVE POLL — show voting UI
              return (
                <div key={poll.id} className="rlc-card">
                  {!expired && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 bg-rlc-bg-light rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${remaining <= 5 ? 'bg-rlc-red' : remaining <= 10 ? 'bg-rlc-amber' : 'bg-rlc-accent'}`}
                          style={{ width: `${timerPct}%` }} />
                      </div>
                      <span className={`text-xs font-mono font-bold ${remaining <= 5 ? 'text-rlc-red animate-pulse' : 'text-rlc-muted'}`}>{remaining}s</span>
                    </div>
                  )}
                  {expired && !answered && !isClosed && <p className="text-xs text-rlc-red mb-2">⏰ Time&apos;s up!</p>}

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

                  {answered && !isClosed && (
                    <div className="mt-3 pt-2 border-t border-rlc-border/30 text-center">
                      <p className="text-xs text-rlc-accent">✓ Vote recorded — results coming soon</p>
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

      </div>
    </main>
  );
}
