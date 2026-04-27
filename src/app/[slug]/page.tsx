'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar, MapPin, Users, Microscope, MonitorPlay, Award, Coffee,
  Stethoscope, ChevronRight, Bot,
} from 'lucide-react';

const WHAT_TO_EXPECT = [
  { icon: Bot, title: 'Live Surgeries', desc: 'Watch cutting-edge procedures performed live by master surgeons.' },
  { icon: Microscope, title: 'Hands-on Workshops', desc: 'Training sessions with expert mentors and simulation labs.' },
  { icon: MonitorPlay, title: 'Video Presentations', desc: 'Curated surgical videos with panel discussions.' },
  { icon: Users, title: 'Panel Discussions', desc: 'Multi-disciplinary debates on the future of surgery.' },
  { icon: Award, title: 'Awards & Recognition', desc: 'Best paper, best video, and innovation awards.' },
  { icon: Coffee, title: 'Networking', desc: 'Meet industry leaders and build connections.' },
];

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();

    sb.rpc('get_event_by_slug', { p_slug: slug }).then(({ data }) => {
      if (!data) { setLoading(false); return; }
      const ev = data as any;
      setEvent(ev);

      // Load event-scoped data
      sb.from('rlc_tracks').select('*').eq('event_id', ev.id).eq('active', true)
        .order('day_number').order('display_order').then(({ data: d }) => setTracks(d || []));
      sb.from('rlc_sessions').select('*').eq('event_id', ev.id).eq('visible', true)
        .order('day_number').order('display_order').order('start_time').then(({ data: d }) => setSessions(d || []));
      sb.from('rlc_faculty').select('*').eq('event_id', ev.id).eq('active', true)
        .order('display_order').then(({ data: d }) => setFaculty(d || []));
      sb.from('rlc_sponsors').select('*').eq('event_id', ev.id)
        .order('display_order').then(({ data: d }) => setSponsors(d || []));

      setLoading(false);
    });
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-rlc-muted">Loading...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-rlc-muted">Event not found.</div>;

  const day1Tracks = tracks.filter((t: any) => t.day_number === 1);
  const day2Tracks = tracks.filter((t: any) => t.day_number === 2);
  const day1Sessions = sessions.filter((s: any) => s.day_number === 1 && s.type !== 'drylab');
  const day2Sessions = sessions.filter((s: any) => s.day_number === 2 && s.type !== 'drylab');
  const drylabs = sessions.filter((s: any) => s.type === 'drylab');

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-rlc-bg/80 backdrop-blur-xl border-b border-rlc-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-rlc-accent" />
            <span className="font-bold text-lg tracking-tight">
              Health<span className="text-rlc-accent">1</span> Events
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-rlc-muted">
            <a href="#schedule" className="hover:text-white transition-colors">Schedule</a>
            <a href="#faculty" className="hover:text-white transition-colors">Faculty</a>
          </div>
          {event.registration_open && (
            <Link href={`/${slug}/register`} className="rlc-btn-primary text-sm !py-2 !px-5">Register</Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${event.theme_accent} 1px, transparent 1px), linear-gradient(90deg, ${event.theme_accent} 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
        <div className="absolute top-20 -left-40 w-96 h-96 rounded-full blur-[120px]" style={{ backgroundColor: `${event.theme_accent}15` }} />
        <div className="absolute bottom-0 -right-40 w-96 h-96 rounded-full blur-[120px]" style={{ backgroundColor: `${event.theme_amber}15` }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rlc-accent/10 border border-rlc-accent/20 text-rlc-accent text-sm font-medium mb-6">
            <Calendar className="w-4 h-4" />
            {event.start_date && formatDate(event.start_date)}
            {event.end_date && event.end_date !== event.start_date && ` – ${formatDate(event.end_date)}`}
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-4">
            {event.name}
          </h1>
          {event.tagline && (
            <p className="text-lg sm:text-xl text-rlc-muted max-w-2xl mx-auto mb-8">{event.tagline}</p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {event.registration_open && (
              <Link href={`/${slug}/register`} className="rlc-btn-amber text-base !px-8 !py-3.5">
                Register Now <ChevronRight className="w-5 h-5" />
              </Link>
            )}
            <a href="#schedule" className="rlc-btn-outline text-base !px-8 !py-3.5">View Schedule</a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-rlc-muted">
            {event.venue_city && (
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-rlc-accent" />{event.venue_name || event.venue_city}</span>
            )}
            <span className="flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-rlc-accent" />{tracks.length} Tracks</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-rlc-accent" />{sessions.filter(s => s.type === 'live_surgery').length} Live Surgeries</span>
          </div>
        </div>
      </section>

      {/* Tracks */}
      {tracks.length > 0 && (
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="rlc-section-title">Tracks</h2>
            {[{ label: 'Day 1', items: day1Tracks, color: event.theme_accent },
              { label: 'Day 2', items: day2Tracks, color: event.theme_amber }]
              .filter(d => d.items.length > 0)
              .map(day => (
              <div key={day.label} className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: day.color }}>{day.label}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {day.items.map((t: any) => (
                    <div key={t.code} className="rlc-card !p-4">
                      <h4 className="font-semibold text-white text-sm">{t.display_name}</h4>
                      {t.short_label && <p className="text-xs text-rlc-muted mt-0.5">{t.short_label}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Schedule */}
      <section id="schedule" className="py-16 px-4 sm:px-6 bg-rlc-bg-light/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="rlc-section-title mb-10">Schedule</h2>
          {sessions.length > 0 ? (
            <div className="space-y-10">
              {[{ label: 'Day 1', date: event.start_date, items: day1Sessions, color: event.theme_accent },
                { label: 'Day 2', date: event.end_date, items: day2Sessions, color: event.theme_amber }]
                .filter(d => d.items.length > 0)
                .map(day => (
                <div key={day.label}>
                  <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: day.color }}>
                    {day.label} {day.date && `— ${formatDate(day.date)}`}
                  </h3>
                  <div className="space-y-2">
                    {day.items.map((s: any, i: number) => (
                      <div key={s.id || i} className="rlc-card !p-4 flex gap-4 items-start">
                        <div className="w-20 shrink-0 text-right">
                          {s.start_time && <span className="text-sm font-mono text-rlc-muted">{s.start_time?.slice(0, 5)}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-white text-sm">{s.title}</h4>
                            {s.type && !['tea_break','lunch','other','registration'].includes(s.type) && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rlc-bg-light text-rlc-muted uppercase">{s.type.replace(/_/g, ' ')}</span>
                            )}
                            {s.track_code && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rlc-accent/10 text-rlc-accent">{s.track_code.toUpperCase()}</span>
                            )}
                          </div>
                          {s.subtitle && <p className="text-xs text-rlc-muted mt-1">{s.subtitle}</p>}
                          {s.procedure_name && <p className="text-xs text-rlc-accent/80 mt-1">{s.procedure_name}{s.modality ? ` — ${s.modality}` : ''}</p>}
                        </div>
                        {s.end_time && <div className="text-xs text-rlc-muted shrink-0">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {drylabs.length > 0 && (
                <div className="rlc-card !p-4 border-rlc-accent/30">
                  <h4 className="font-semibold text-rlc-accent text-sm mb-1">{drylabs[0].title}</h4>
                  <p className="text-xs text-rlc-muted">{drylabs[0].subtitle}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-rlc-muted py-8">Schedule coming soon.</p>
          )}
        </div>
      </section>

      {/* Faculty */}
      {faculty.length > 0 && (
        <section id="faculty" className="py-16 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="rlc-section-title mb-10">Faculty</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {faculty.map((f: any) => (
                <div key={f.id} className="rlc-card !p-4 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-rlc-bg-light overflow-hidden mb-3">
                    {f.photo_url ? (
                      <img src={f.photo_url} alt={f.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-rlc-muted"><Stethoscope className="w-8 h-8" /></div>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-white leading-tight">{f.full_name}</h4>
                  {f.designation && <p className="text-xs text-rlc-muted mt-0.5">{f.designation}</p>}
                  {f.city && <p className="text-xs text-rlc-accent mt-0.5">{f.city}</p>}
                  {f.is_featured && (
                    <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-rlc-amber/10 text-rlc-amber rounded-full">FEATURED</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="py-16 px-4 sm:px-6 bg-rlc-bg-light/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="rlc-section-title mb-10">Partners</h2>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {sponsors.map((s: any) => (
                <div key={s.id} className="text-center">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-16 object-contain mx-auto opacity-70 hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="h-16 px-6 flex items-center justify-center bg-rlc-bg-card rounded-lg border border-rlc-border">
                      <span className="text-sm font-medium text-rlc-muted">{s.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {event.registration_open && (
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join?</h2>
            <p className="text-rlc-muted mb-8">Secure your spot. Limited seats available.</p>
            <Link href={`/${slug}/register`} className="rlc-btn-amber text-lg !px-10 !py-4">
              Register Now <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-rlc-border py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-rlc-muted">
            {event.name} — Organised by {event.organizer_name}
          </div>
          <div className="text-xs text-rlc-muted">&copy; {new Date().getFullYear()} H1N1 Super Speciality Hospitals Pvt. Ltd.</div>
        </div>
      </footer>
    </main>
  );
}
