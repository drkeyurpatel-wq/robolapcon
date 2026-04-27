'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DisplayPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [polls, setPolls] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, any[]>>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);

  const sb = createClient();

  useEffect(() => {
    sb.rpc('get_event_by_slug', { p_slug: slug }).then(({ data }) => { if (data) setEvent(data); });
  }, [slug]);

  const loadData = async (eid: string) => {
    const { data: p } = await sb.from('event_polls').select('*').eq('event_id', eid)
      .in('status', ['live']).eq('show_results', true).order('display_order');
    setPolls(p || []);

    // Load responses for each poll
    const respMap: Record<string, any[]> = {};
    for (const poll of (p || [])) {
      const { data: r } = await sb.from('event_poll_responses').select('response').eq('poll_id', poll.id);
      respMap[poll.id] = r || [];
    }
    setResponses(respMap);

    const { data: q } = await sb.from('event_qa').select('*').eq('event_id', eid).eq('is_approved', true)
      .order('is_pinned', { ascending: false }).order('upvote_count', { ascending: false }).limit(5);
    setQuestions(q || []);

    const { data: u } = await sb.from('event_live_updates').select('*').eq('event_id', eid)
      .order('created_at', { ascending: false }).limit(3);
    setUpdates(u || []);
  };

  useEffect(() => {
    if (!event) return;
    loadData(event.id);

    // Refresh every 5 seconds + realtime
    const interval = setInterval(() => loadData(event.id), 5000);

    const ch = sb.channel('display-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_polls', filter: `event_id=eq.${event.id}` }, () => loadData(event.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_poll_responses' }, () => loadData(event.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_qa', filter: `event_id=eq.${event.id}` }, () => loadData(event.id))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_live_updates', filter: `event_id=eq.${event.id}` }, () => loadData(event.id))
      .subscribe();

    return () => { clearInterval(interval); sb.removeChannel(ch); };
  }, [event]);

  if (!event) return <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center text-gray-500">Loading display...</div>;

  const getBarData = (poll: any) => {
    const resps = responses[poll.id] || [];
    const options = (poll.options || []) as { label: string; color?: string }[];
    const counts: Record<string, number> = {};
    options.forEach(o => { counts[o.label] = 0; });
    resps.forEach(r => { const c = r.response?.choice; if (c && counts[c] !== undefined) counts[c]++; });
    const total = resps.length || 1;
    return options.map((o, i) => ({
      label: o.label,
      count: counts[o.label] || 0,
      pct: Math.round(((counts[o.label] || 0) / total) * 100),
      color: o.color || ['#00A99D', '#FDB913', '#E31E24', '#6366f1', '#ec4899'][i % 5],
    }));
  };

  const getRatingData = (poll: any) => {
    const resps = responses[poll.id] || [];
    if (resps.length === 0) return { avg: 0, count: 0 };
    const sum = resps.reduce((s, r) => s + (r.response?.rating || 0), 0);
    return { avg: (sum / resps.length).toFixed(1), count: resps.length };
  };

  const hasContent = polls.length > 0 || questions.length > 0 || updates.length > 0;

  return (
    <main className="min-h-screen bg-[#0a0f1a] text-white p-8" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Event name watermark */}
      <div className="fixed top-6 right-8 text-sm font-bold text-white/20">{event.name}</div>
      <div className="fixed bottom-6 right-8 flex items-center gap-2 text-xs text-white/20">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
      </div>

      {!hasContent && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl font-black mb-4" style={{ color: event.theme_accent }}>{event.name}</div>
            <p className="text-xl text-gray-400">{event.tagline}</p>
            <p className="text-sm text-gray-600 mt-8">Polls and Q&A will appear here when active</p>
          </div>
        </div>
      )}

      {hasContent && (
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-8 min-h-[calc(100vh-4rem)]">
          {/* Polls — takes 2 columns */}
          <div className="col-span-2 space-y-8">
            {polls.map(poll => (
              <div key={poll.id}>
                <h2 className="text-3xl font-bold mb-6">{poll.question}</h2>
                {(poll.poll_type === 'multiple_choice' || poll.poll_type === 'yes_no') && (
                  <div className="space-y-4">
                    {getBarData(poll).map((bar, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="text-lg font-medium">{bar.label}</span>
                          <span className="text-lg font-bold" style={{ color: bar.color }}>{bar.pct}%</span>
                        </div>
                        <div className="h-12 bg-white/5 rounded-xl overflow-hidden">
                          <div className="h-full rounded-xl transition-all duration-1000 ease-out flex items-center pl-4"
                            style={{ width: `${Math.max(bar.pct, 2)}%`, backgroundColor: bar.color }}>
                            <span className="text-sm font-bold text-white/80">{bar.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <p className="text-sm text-gray-500">{(responses[poll.id] || []).length} responses</p>
                  </div>
                )}
                {poll.poll_type === 'rating' && (() => {
                  const { avg, count } = getRatingData(poll);
                  return (
                    <div className="text-center py-8">
                      <div className="text-8xl font-black" style={{ color: event.theme_accent }}>{avg}</div>
                      <div className="text-2xl text-gray-400 mt-2">out of 5</div>
                      <div className="text-sm text-gray-500 mt-4">{count} responses</div>
                    </div>
                  );
                })()}
              </div>
            ))}

            {/* Live updates */}
            {updates.length > 0 && polls.length === 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Live Commentary</h3>
                <div className="space-y-3">
                  {updates.map(u => (
                    <div key={u.id} className={`p-4 rounded-xl bg-white/5 ${u.update_type === 'milestone' ? 'border-l-4 border-yellow-500' : ''}`}>
                      <p className="text-lg">{u.content}</p>
                      <p className="text-xs text-gray-500 mt-1">{u.author_name} · {new Date(u.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Q&A sidebar */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Top Questions</h3>
            <div className="space-y-3">
              {questions.map(q => (
                <div key={q.id} className={`p-4 rounded-xl bg-white/5 ${q.is_pinned ? 'border border-yellow-500/30' : ''}`}>
                  <div className="flex gap-3">
                    <div className="text-center shrink-0">
                      <div className="text-2xl font-bold" style={{ color: event.theme_accent }}>{q.upvote_count}</div>
                      <div className="text-[10px] text-gray-500">votes</div>
                    </div>
                    <div>
                      <p className="text-sm">{q.question_text}</p>
                      <p className="text-xs text-gray-500 mt-1">{q.delegate_name}</p>
                    </div>
                  </div>
                </div>
              ))}
              {questions.length === 0 && <p className="text-sm text-gray-600">Questions will appear here</p>}
            </div>

            {/* Commentary in sidebar when polls active */}
            {updates.length > 0 && polls.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Live Feed</h3>
                {updates.slice(0, 3).map(u => (
                  <div key={u.id} className="p-3 rounded-lg bg-white/5 mb-2">
                    <p className="text-xs">{u.content}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{new Date(u.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
