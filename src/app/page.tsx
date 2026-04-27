'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Calendar, MapPin, ChevronRight, Stethoscope } from 'lucide-react';

export default function HomePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.from('events_public')
      .select('*')
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, []);

  const upcoming = events.filter(e => !e.end_date || new Date(e.end_date) >= new Date());
  const past = events.filter(e => e.end_date && new Date(e.end_date) < new Date());

  const formatDate = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.toLocaleDateString('en-IN', opts)}`;
    }
    return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`;
  };

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-rlc-bg/80 backdrop-blur-xl border-b border-rlc-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-rlc-accent" />
            <span className="font-bold text-lg tracking-tight">
              Health<span className="text-rlc-accent">1</span> Events
            </span>
          </div>
          <Link href="/admin/login" className="text-sm text-rlc-muted hover:text-white transition-colors">
            Admin
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="absolute top-20 -left-40 w-96 h-96 bg-rlc-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-rlc-amber/10 rounded-full blur-[120px]" />
        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4">
            Health<span className="rlc-gradient-text">1</span> Events
          </h1>
          <p className="text-lg text-rlc-muted max-w-xl mx-auto">
            Conferences, workshops, and CME programmes by Health1 Super Speciality Hospitals.
          </p>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="text-center py-12 text-rlc-muted">Loading events...</div>
          ) : upcoming.length > 0 ? (
            <>
              <h2 className="text-sm font-semibold text-rlc-accent uppercase tracking-widest mb-6">
                Upcoming Events
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {upcoming.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/${ev.slug}`}
                    className="rlc-card group hover:border-rlc-accent/50 transition-all duration-300 flex flex-col"
                  >
                    {ev.banner_url && (
                      <div className="h-40 -mx-6 -mt-6 mb-4 rounded-t-xl overflow-hidden bg-rlc-bg-light">
                        <img src={ev.banner_url} alt={ev.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-rlc-accent transition-colors">
                        {ev.name}
                      </h3>
                      {ev.tagline && (
                        <p className="text-sm text-rlc-muted mt-1">{ev.tagline}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-rlc-border/50 text-sm text-rlc-muted">
                      {ev.start_date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-rlc-accent" />
                          {formatDate(ev.start_date, ev.end_date || ev.start_date)}
                        </span>
                      )}
                      {ev.venue_city && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-rlc-accent" />
                          {ev.venue_city}
                        </span>
                      )}
                      <span className="ml-auto text-rlc-accent font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        View <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                    {ev.registration_open && (
                      <div className="mt-3">
                        <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-rlc-accent/10 text-rlc-accent">
                          Registration Open
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-rlc-muted">No upcoming events. Check back soon.</p>
            </div>
          )}

          {/* Past Events */}
          {past.length > 0 && (
            <div className="mt-16">
              <h2 className="text-sm font-semibold text-rlc-muted uppercase tracking-widest mb-6">
                Past Events
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {past.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/${ev.slug}`}
                    className="rlc-card !p-4 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <h4 className="font-semibold text-white text-sm">{ev.name}</h4>
                    <p className="text-xs text-rlc-muted mt-1">{ev.venue_city} &middot; {ev.start_date}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rlc-border py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-rlc-muted">
            <Stethoscope className="w-5 h-5 text-rlc-accent" />
            Health1 Events — Powered by Health1 Super Speciality Hospitals
          </div>
          <div className="text-xs text-rlc-muted">
            &copy; {new Date().getFullYear()} H1N1 Super Speciality Hospitals Pvt. Ltd.
          </div>
        </div>
      </footer>
    </main>
  );
}
