'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';
const COLORS = ['#00A99D', '#FDB913', '#E31E24', '#6366f1', '#ec4899', '#14b8a6'];

export default function DisplayPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [poll, setPoll] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'voting' | 'reveal'>('idle');
  const [responseCount, setResponseCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Once a given poll launch (id + launched_at) has been revealed, don't let the
  // 2s poll / realtime drag the screen back into 'voting' while the DB row is
  // still 'live' for the gap before it closes. This was the source of the strobe.
  const revealedKeyRef = useRef<string | null>(null);
  const sb = createClient();

  useEffect(() => {
    sb.rpc('get_event_by_slug', { p_slug: slug }).then(({ data }) => { if (data) setEvent(data); });
  }, [slug]);

  // Poll for live poll state every 2s + realtime
  useEffect(() => {
    if (!event) return;

    const checkPoll = async () => {
      const { data } = await sb.rpc('event_get_live_poll', { p_event_id: event.id });
      const p = data as any;
      if (p?.id) {
        setPoll(p);
        setResponseCount(p.response_count || 0);
        // If this exact poll launch has already been revealed locally, hold the
        // results on screen instead of snapping back to voting.
        const key = `${p.id}:${p.launched_at}`;
        if (revealedKeyRef.current === key) return;
        if (p.status === 'live' && !p.show_results) {
          setPhase('voting');
          // Compute countdown
          if (p.launched_at) {
            const elapsed = Math.floor((Date.now() - new Date(p.launched_at).getTime()) / 1000);
            const remaining = Math.max(0, (p.duration_seconds || 30) - elapsed);
            setCountdown(remaining);
          }
        }
      } else {
        // Check if there's a recently closed poll to show results
        if (poll?.id && phase === 'voting') {
          // Poll just closed — fetch results
          const { data: r } = await sb.rpc('event_get_poll_results', { p_poll_id: poll.id });
          if ((r as any)?.success && (r as any)?.show_results) {
            revealedKeyRef.current = `${poll.id}:${poll.launched_at}`;
            setResults(r);
            setPhase('reveal');
            setCountdown(null);
          }
        } else if (phase !== 'reveal') {
          setPoll(null);
          setPhase('idle');
          setCountdown(null);
        }
      }
    };

    checkPoll();
    const interval = setInterval(checkPoll, 2000);

    const ch = sb.channel('display-polls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_polls', filter: `event_id=eq.${event.id}` }, checkPoll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_poll_responses' }, () => {
        setResponseCount(c => c + 1);
      })
      .subscribe();

    return () => { clearInterval(interval); sb.removeChannel(ch); };
  }, [event, poll?.id, phase]);

  // Countdown ticker
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (phase !== 'voting' || countdown === null) return;

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // When countdown hits 0, transition to reveal
  useEffect(() => {
    if (countdown === 0 && phase === 'voting' && poll?.id) {
      const fetchResults = async () => {
        // Small delay for last-second votes
        await new Promise(r => setTimeout(r, 1500));
        const { data } = await sb.rpc('event_get_poll_results', { p_poll_id: poll.id });
        if ((data as any)?.success) {
          revealedKeyRef.current = `${poll.id}:${poll.launched_at}`;
          setResults(data);
          setPhase('reveal');
        }
      };
      fetchResults();
    }
  }, [countdown, phase, poll?.id]);

  // Auto-return to idle after showing results for 15s
  useEffect(() => {
    if (phase === 'reveal') {
      const t = setTimeout(() => { setPhase('idle'); setPoll(null); setResults(null); }, 15000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const liveUrl = typeof window !== 'undefined' ? `${window.location.origin}/${slug}/live` : '';
  const qrUrl = `${QR_API}?data=${encodeURIComponent(liveUrl)}&size=300x300&format=png&color=ffffff&bgcolor=0a0f1a`;

  if (!event) return <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center text-gray-600">Loading...</div>;

  // ============ IDLE SCREEN ============
  if (phase === 'idle') {
    return (
      <main className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-12" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="text-center">
          <h1 className="text-7xl font-black text-white mb-3">{event.name}</h1>
          <p className="text-2xl text-gray-400 mb-16">{event.tagline}</p>
          <div className="inline-block bg-white rounded-3xl p-6 mb-6">
            <img src={qrUrl} alt="Scan to join" className="w-48 h-48" />
          </div>
          <p className="text-lg text-gray-500">Scan to participate in live polls</p>
        </div>
      </main>
    );
  }

  // ============ VOTING SCREEN ============
  if (phase === 'voting' && poll) {
    const options = (poll.options || []) as { label: string }[];
    const isUrgent = countdown !== null && countdown <= 10;

    return (
      <main className="min-h-screen bg-[#0a0f1a] flex p-12" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {/* Left: Question + Timer */}
        <div className="flex-1 flex flex-col justify-center pr-12">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold text-red-400 uppercase tracking-widest">LIVE POLL</span>
              <span className="ml-auto flex items-center gap-2 text-sm text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {responseCount} votes
              </span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight">{poll.question}</h1>
          </div>

          {/* Options preview */}
          <div className="space-y-3 mb-12">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="text-2xl text-gray-300">{o.label}</span>
              </div>
            ))}
          </div>

          {/* Timer */}
          <div className={`text-center transition-all duration-300 ${isUrgent ? 'scale-110' : ''}`}>
            <div className={`text-[120px] font-black tabular-nums leading-none ${isUrgent ? 'text-red-500' : 'text-white'}`}>
              {countdown ?? 0}
            </div>
            <p className={`text-xl mt-2 ${isUrgent ? 'text-red-400' : 'text-gray-500'}`}>
              {isUrgent ? 'Hurry!' : 'seconds remaining'}
            </p>
          </div>
        </div>

        {/* Right: QR Code */}
        <div className="w-80 flex flex-col items-center justify-center">
          <div className="bg-white rounded-3xl p-5 mb-4">
            <img src={qrUrl} alt="Scan to vote" className="w-52 h-52" />
          </div>
          <p className="text-gray-400 text-center text-sm">Scan to vote on your phone</p>
        </div>
      </main>
    );
  }

  // ============ REVEAL SCREEN ============
  if (phase === 'reveal' && results) {
    const options = (results.options || []) as { label: string }[];
    const resultData = (results.results || []) as { choice: string; count: number }[];
    const total = results.total || 1;

    const bars = options.map((o, i) => {
      const r = resultData.find((rd: any) => rd.choice === o.label);
      const count = r?.count || 0;
      const pct = Math.round((count / total) * 100);
      return { label: o.label, count, pct, color: COLORS[i % COLORS.length] };
    });

    const winner = bars.reduce((a, b) => a.pct > b.pct ? a : b, bars[0]);

    return (
      <main className="min-h-screen bg-[#0a0f1a] flex flex-col justify-center p-16" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">RESULTS</span>
          <span className="text-sm text-gray-500">{total} votes</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-12">{results.question}</h1>

        <div className="space-y-6 max-w-5xl">
          {bars.map((bar, i) => (
            <div key={i}>
              <div className="flex justify-between mb-2">
                <span className="text-2xl font-medium text-white">{bar.label}</span>
                <span className="text-2xl font-black" style={{ color: bar.color }}>{bar.pct}%</span>
              </div>
              <div className="h-16 bg-white/5 rounded-2xl overflow-hidden">
                <div
                  className="h-full rounded-2xl flex items-center pl-6 transition-all duration-[2000ms] ease-out"
                  style={{
                    width: `${Math.max(bar.pct, 3)}%`,
                    backgroundColor: bar.color,
                    animation: 'growBar 2s ease-out forwards',
                  }}
                >
                  <span className="text-lg font-bold text-white/80">{bar.count} votes</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {winner && (
          <div className="mt-12 text-center">
            <span className="text-lg text-gray-500">Most popular: </span>
            <span className="text-2xl font-bold" style={{ color: winner.color }}>{winner.label}</span>
          </div>
        )}

        <style>{`
          @keyframes growBar { from { width: 0%; } }
        `}</style>
      </main>
    );
  }

  return null;
}
