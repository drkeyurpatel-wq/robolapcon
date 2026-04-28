'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';
const COLORS = ['#00A99D', '#FDB913', '#E31E24', '#6366f1', '#ec4899', '#14b8a6'];

export default function DisplayPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [poll, setPoll] = useState<any>(null);       // current active/closed poll
  const [responses, setResponses] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [phase, setPhase] = useState<'idle' | 'voting' | 'reveal'>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sb = createClient();

  // Load event
  useEffect(() => {
    sb.rpc('get_event_by_slug', { p_slug: slug }).then(({ data }) => { if (data) setEvent(data); });
  }, [slug]);

  // Poll + Realtime
  useEffect(() => {
    if (!event) return;
    const eid = event.id;

    const loadPoll = async () => {
      // Get the most recent live or just-closed poll
      const { data: livePolls } = await sb.from('event_polls').select('*').eq('event_id', eid).eq('status', 'live').order('launched_at', { ascending: false }).limit(1);
      if (livePolls && livePolls.length > 0) {
        const p = livePolls[0];
        setPoll(p);
        setPhase('voting');
        // Calculate remaining time
        const elapsed = Math.floor((Date.now() - new Date(p.launched_at).getTime()) / 1000);
        setTimeLeft(Math.max(0, (p.timer_seconds || 30) - elapsed));
        // Load current responses
        const { data: r } = await sb.from('event_poll_responses').select('response').eq('poll_id', p.id);
        setResponses(r || []);
        return;
      }

      // Check for recently closed poll (show results)
      const { data: closedPolls } = await sb.from('event_polls').select('*').eq('event_id', eid).eq('status', 'closed').eq('show_results', true).order('updated_at', { ascending: false }).limit(1);
      if (closedPolls && closedPolls.length > 0) {
        const p = closedPolls[0];
        setPoll(p);
        setPhase('reveal');
        const { data: r } = await sb.from('event_poll_responses').select('response').eq('poll_id', p.id);
        setResponses(r || []);
        return;
      }

      setPoll(null);
      setPhase('idle');
    };

    loadPoll();
    const interval = setInterval(loadPoll, 2000);

    // Realtime for instant response count updates
    const ch = sb.channel('display-responses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_polls', filter: `event_id=eq.${eid}` }, () => loadPoll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_poll_responses' }, () => {
        if (poll?.id) {
          sb.from('event_poll_responses').select('response').eq('poll_id', poll.id).then(({ data: r }) => setResponses(r || []));
        }
      })
      .subscribe();

    // Q&A
    sb.from('event_qa').select('*').eq('event_id', eid).eq('is_approved', true)
      .order('is_pinned', { ascending: false }).order('upvote_count', { ascending: false }).limit(5)
      .then(({ data }) => setQuestions(data || []));

    return () => { clearInterval(interval); sb.removeChannel(ch); };
  }, [event, poll?.id]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'voting') return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, poll?.id]);

  if (!event) return <div className="min-h-screen bg-[#060a14]" />;

  const liveUrl = typeof window !== 'undefined' ? `${window.location.origin}/${slug}/live` : '';
  const qrUrl = `${QR_API}?data=${encodeURIComponent(liveUrl)}&size=300x300&format=png&color=00A99D&bgcolor=060a14`;

  const getBarData = () => {
    if (!poll) return [];
    const options = (poll.options || []) as { label: string }[];
    const counts: Record<string, number> = {};
    options.forEach(o => { counts[o.label] = 0; });
    responses.forEach(r => { const c = r.response?.choice; if (c && counts[c] !== undefined) counts[c]++; });
    const total = responses.length || 1;
    return options.map((o, i) => ({
      label: o.label, count: counts[o.label] || 0,
      pct: Math.round(((counts[o.label] || 0) / total) * 100),
      color: COLORS[i % COLORS.length],
    }));
  };

  const getRatingAvg = () => {
    if (!responses.length) return '0.0';
    return (responses.reduce((s, r) => s + (r.response?.rating || 0), 0) / responses.length).toFixed(1);
  };

  // === IDLE: event name + QR ===
  if (phase === 'idle') {
    return (
      <main className="min-h-screen bg-[#060a14] flex items-center justify-center" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="text-center">
          <h1 className="text-6xl font-black text-white mb-2">{event.name}</h1>
          <p className="text-xl text-gray-500 mb-12">{event.tagline}</p>
          <div className="inline-block bg-white rounded-3xl p-5 mb-6">
            <img src={qrUrl} alt="Scan to join" className="w-48 h-48" />
          </div>
          <p className="text-gray-400 text-lg">Scan to participate in live polls & Q&A</p>
          <p className="text-gray-600 text-sm mt-2 font-mono">{liveUrl}</p>

          {/* Q&A sidebar at bottom */}
          {questions.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-xl border-t border-white/10 px-8 py-4">
              <div className="max-w-5xl mx-auto flex gap-6 overflow-x-auto">
                {questions.slice(0, 3).map(q => (
                  <div key={q.id} className="flex-1 min-w-[250px]">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl font-bold text-rlc-accent">{q.upvote_count}</span>
                      <div>
                        <p className="text-sm text-white">{q.question_text}</p>
                        <p className="text-xs text-gray-500">{q.delegate_name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // === VOTING: question + QR + countdown ===
  if (phase === 'voting') {
    const bars = getBarData();
    const timerPct = poll ? (timeLeft / (poll.timer_seconds || 30)) * 100 : 0;

    return (
      <main className="min-h-screen bg-[#060a14] flex" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {/* Main area */}
        <div className="flex-1 flex flex-col justify-center px-16 py-12">
          <h2 className="text-5xl font-black text-white leading-tight mb-10">{poll?.question}</h2>

          {/* Live vote count bar (shows counts accumulating, no percentages yet) */}
          {(poll?.poll_type === 'multiple_choice' || poll?.poll_type === 'yes_no') && (
            <div className="space-y-4">
              {bars.map((bar, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xl font-medium text-gray-300">{bar.label}</span>
                    <span className="text-xl font-bold text-gray-500">{bar.count}</span>
                  </div>
                  <div className="h-10 bg-white/5 rounded-xl overflow-hidden">
                    <div className="h-full rounded-xl transition-all duration-500" style={{ width: `${Math.max(bar.pct, 2)}%`, backgroundColor: `${bar.color}40` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {poll?.poll_type === 'rating' && (
            <div className="text-center py-8">
              <span className="text-8xl font-black text-gray-500">{responses.length}</span>
              <span className="text-3xl text-gray-600 ml-3">responses</span>
            </div>
          )}

          <p className="text-gray-600 mt-8 text-sm">{responses.length} votes received</p>
        </div>

        {/* Right panel: QR + Timer */}
        <div className="w-80 flex flex-col items-center justify-center border-l border-white/5 px-8">
          {/* Countdown */}
          <div className="mb-8 text-center">
            <div className={`text-7xl font-black font-mono ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : timeLeft <= 10 ? 'text-rlc-amber' : 'text-white'}`}>
              {timeLeft}
            </div>
            <p className="text-gray-500 text-sm mt-1">seconds left</p>
            {/* Timer bar */}
            <div className="w-full h-1.5 bg-white/5 rounded-full mt-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-rlc-amber' : 'bg-rlc-accent'}`}
                style={{ width: `${timerPct}%` }} />
            </div>
          </div>

          {/* QR */}
          <div className="bg-white rounded-2xl p-4 mb-4">
            <img src={qrUrl} alt="Scan to vote" className="w-40 h-40" />
          </div>
          <p className="text-gray-500 text-sm text-center">Scan to vote</p>
        </div>
      </main>
    );
  }

  // === REVEAL: animated results ===
  if (phase === 'reveal') {
    const bars = getBarData();
    const maxPct = Math.max(...bars.map(b => b.pct), 1);

    return (
      <main className="min-h-screen bg-[#060a14] flex items-center justify-center px-16" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="w-full max-w-4xl">
          <h2 className="text-5xl font-black text-white leading-tight mb-12">{poll?.question}</h2>

          {(poll?.poll_type === 'multiple_choice' || poll?.poll_type === 'yes_no') && (
            <div className="space-y-6">
              {bars.map((bar, i) => {
                const isWinner = bar.pct === maxPct && responses.length > 0;
                return (
                  <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 200}ms`, animationFillMode: 'both' }}>
                    <div className="flex justify-between mb-2">
                      <span className={`text-2xl font-semibold ${isWinner ? 'text-white' : 'text-gray-400'}`}>{bar.label}</span>
                      <span className={`text-2xl font-black ${isWinner ? '' : 'text-gray-400'}`} style={isWinner ? { color: bar.color } : {}}>{bar.pct}%</span>
                    </div>
                    <div className="h-14 bg-white/5 rounded-2xl overflow-hidden">
                      <div className={`h-full rounded-2xl flex items-center pl-5 transition-all duration-1000 ease-out`}
                        style={{ width: `${Math.max(bar.pct, 3)}%`, backgroundColor: isWinner ? bar.color : `${bar.color}60`, animationDelay: `${i * 200 + 300}ms` }}>
                        <span className="text-white font-bold text-lg">{bar.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {poll?.poll_type === 'rating' && (
            <div className="text-center py-12">
              <div className="text-9xl font-black animate-fade-in-up" style={{ color: event.theme_accent }}>{getRatingAvg()}</div>
              <div className="text-3xl text-gray-400 mt-4 animate-fade-in-up animate-delay-200">out of 5</div>
              <div className="flex justify-center gap-2 mt-6">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className={`text-4xl ${parseFloat(getRatingAvg()) >= n ? '': 'opacity-20'}`}>★</div>
                ))}
              </div>
            </div>
          )}

          <p className="text-gray-600 mt-8 text-center">{responses.length} total votes</p>
        </div>
      </main>
    );
  }

  return null;
}
