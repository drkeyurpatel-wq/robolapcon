'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  MapPin,
  Users,
  Microscope,
  MonitorPlay,
  Award,
  Coffee,
  Stethoscope,
  ChevronRight,
  Bot,
} from 'lucide-react';

const WHAT_TO_EXPECT = [
  {
    icon: Bot,
    title: 'Robotic Live Surgeries',
    desc: 'Watch cutting-edge robotic procedures performed live by master surgeons.',
  },
  {
    icon: Microscope,
    title: 'Laparoscopic Workshops',
    desc: 'Hands-on training sessions with expert mentors and simulation labs.',
  },
  {
    icon: MonitorPlay,
    title: 'Video Presentations',
    desc: 'Curated surgical videos with panel discussions and technique breakdowns.',
  },
  {
    icon: Users,
    title: 'Panel Discussions',
    desc: 'Multi-disciplinary debates on the future of minimally invasive surgery.',
  },
  {
    icon: Award,
    title: 'Awards & Recognition',
    desc: 'Best paper, best video, and innovation awards for young surgeons.',
  },
  {
    icon: Coffee,
    title: 'Networking & Exhibition',
    desc: 'Meet industry leaders, explore the latest devices, and build connections.',
  },
];

export default function HomePage() {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    const sb = createClient();

    sb.from('rlc_faculty')
      .select('*')
      .eq('active', true)
      .order('display_order')
      .then(({ data }) => setFaculty(data || []));

    sb.from('rlc_tracks')
      .select('*')
      .eq('active', true)
      .order('day_number')
      .order('display_order')
      .then(({ data }) => setTracks(data || []));

    sb.from('rlc_sponsors_public')
      .select('*')
      .then(({ data }) => setSponsors(data || []));
  }, []);

  const day1Tracks = tracks.filter((t) => t.day_number === 1);
  const day2Tracks = tracks.filter((t) => t.day_number === 2);

  return (
    <main className="min-h-screen">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-rlc-bg/80 backdrop-blur-xl border-b border-rlc-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-7 h-7 text-rlc-accent" />
            <span className="font-bold text-lg tracking-tight">
              ROBOLAP<span className="text-rlc-accent">CON</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-rlc-muted">
            <a href="#tracks" className="hover:text-white transition-colors">
              Tracks
            </a>
            <a href="#faculty" className="hover:text-white transition-colors">
              Faculty
            </a>
            <a href="#sponsors" className="hover:text-white transition-colors">
              Sponsors
            </a>
          </div>
          <Link href="/register" className="rlc-btn-primary text-sm !py-2 !px-5">
            Register Now
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#00A99D 1px, transparent 1px), linear-gradient(90deg, #00A99D 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-20 -left-40 w-96 h-96 bg-rlc-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-rlc-amber/10 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rlc-accent/10 border border-rlc-accent/20 text-rlc-accent text-sm font-medium mb-6 animate-fade-in-up">
            <Calendar className="w-4 h-4" />
            Coming Soon — 2026
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 animate-fade-in-up animate-delay-100">
            ROBOLAP
            <span className="rlc-gradient-text">CON</span>
            <br />
            <span className="text-3xl sm:text-4xl md:text-5xl font-semibold text-rlc-muted">
              2026
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-rlc-muted max-w-2xl mx-auto mb-8 animate-fade-in-up animate-delay-200">
            India&apos;s premier national conference on{' '}
            <span className="text-white font-medium">Robotic</span> &amp;{' '}
            <span className="text-white font-medium">Laparoscopic</span> Surgery.
            <br />2 days. 6 tracks. 50+ faculty. Live surgeries.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up animate-delay-300">
            <Link href="/register" className="rlc-btn-amber text-base !px-8 !py-3.5">
              Register Now <ChevronRight className="w-5 h-5" />
            </Link>
            <a href="#tracks" className="rlc-btn-outline text-base !px-8 !py-3.5">
              View Programme
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-rlc-muted animate-fade-in-up animate-delay-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rlc-accent" /> Ahmedabad, Gujarat
            </span>
            <span className="flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-rlc-accent" /> 6 Surgical Tracks
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-rlc-accent" /> 500+ Delegates Expected
            </span>
          </div>
        </div>
      </section>

      {/* TRACKS */}
      <section id="tracks" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="rlc-section-title">
            Conference <span className="rlc-gradient-text">Tracks</span>
          </h2>
          <p className="text-center text-rlc-muted mb-12 max-w-xl mx-auto">
            Choose your learning path across two packed days of surgical excellence.
          </p>

          {/* Day 1 */}
          {day1Tracks.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-rlc-accent uppercase tracking-widest mb-4">
                Day 1
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {day1Tracks.map((t) => (
                  <div
                    key={t.code}
                    className="rlc-card hover:border-rlc-accent/50 transition-colors group"
                  >
                    <div
                      className="w-2 h-2 rounded-full mb-3"
                      style={{ backgroundColor: '#00A99D' }}
                    />
                    <h4 className="font-semibold text-white group-hover:text-rlc-accent transition-colors">
                      {t.display_name}
                    </h4>
                    {t.description && (
                      <p className="text-sm text-rlc-muted mt-1">{t.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day 2 */}
          {day2Tracks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-rlc-amber uppercase tracking-widest mb-4">
                Day 2
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {day2Tracks.map((t) => (
                  <div
                    key={t.code}
                    className="rlc-card hover:border-rlc-amber/50 transition-colors group"
                  >
                    <div
                      className="w-2 h-2 rounded-full mb-3"
                      style={{ backgroundColor: '#FDB913' }}
                    />
                    <h4 className="font-semibold text-white group-hover:text-rlc-amber transition-colors">
                      {t.display_name}
                    </h4>
                    {t.description && (
                      <p className="text-sm text-rlc-muted mt-1">{t.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tracks.length === 0 && (
            <p className="text-center text-rlc-muted py-8">
              Track information coming soon.
            </p>
          )}
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="py-20 px-4 sm:px-6 bg-rlc-bg-light/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="rlc-section-title">
            What to <span className="rlc-gradient-text">Expect</span>
          </h2>
          <p className="text-center text-rlc-muted mb-12 max-w-xl mx-auto">
            A curated experience designed for surgeons who want to stay ahead.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHAT_TO_EXPECT.map((item, i) => (
              <div
                key={i}
                className="rlc-card hover:border-rlc-accent/40 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-lg bg-rlc-accent/10 flex items-center justify-center mb-4 group-hover:bg-rlc-accent/20 transition-colors">
                  <item.icon className="w-6 h-6 text-rlc-accent" />
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-rlc-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FACULTY */}
      <section id="faculty" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="rlc-section-title">
            Our <span className="rlc-gradient-text">Faculty</span>
          </h2>
          <p className="text-center text-rlc-muted mb-12 max-w-xl mx-auto">
            Learn from pioneers in robotic and laparoscopic surgery.
          </p>
          {faculty.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {faculty.map((f) => (
                <div
                  key={f.id}
                  className="rlc-card !p-4 text-center hover:border-rlc-accent/40 transition-colors"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-rlc-bg-light overflow-hidden mb-3">
                    {f.photo_url ? (
                      <img
                        src={f.photo_url}
                        alt={f.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-rlc-muted">
                        <Stethoscope className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-white leading-tight">
                    {f.full_name}
                  </h4>
                  {f.designation && (
                    <p className="text-xs text-rlc-muted mt-0.5">{f.designation}</p>
                  )}
                  {f.city && (
                    <p className="text-xs text-rlc-accent mt-0.5">{f.city}</p>
                  )}
                  {f.is_featured && (
                    <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-rlc-amber/10 text-rlc-amber rounded-full">
                      KEYNOTE
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-rlc-muted py-8">
              Faculty announcements coming soon.
            </p>
          )}
        </div>
      </section>

      {/* SPONSORS */}
      <section id="sponsors" className="py-20 px-4 sm:px-6 bg-rlc-bg-light/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="rlc-section-title">
            Our <span className="rlc-gradient-text">Partners</span>
          </h2>
          {sponsors.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-8 mt-12">
              {sponsors.map((s) => (
                <div key={s.id} className="text-center">
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className="h-16 object-contain mx-auto opacity-70 hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="h-16 px-6 flex items-center justify-center bg-rlc-bg-card rounded-lg border border-rlc-border">
                      <span className="text-sm font-medium text-rlc-muted">
                        {s.name}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-rlc-muted mt-2 uppercase tracking-wider">
                    {s.tier}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-rlc-muted py-8">
              Sponsorship opportunities available.
            </p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to <span className="rlc-gradient-text">Join?</span>
          </h2>
          <p className="text-rlc-muted mb-8">
            Secure your spot at ROBOLAPCON 2026. Limited seats available.
          </p>
          <Link href="/register" className="rlc-btn-amber text-lg !px-10 !py-4">
            Register Now <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-rlc-border py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-rlc-muted">
            <Bot className="w-5 h-5 text-rlc-accent" />
            <span>ROBOLAPCON 2026 — Organised by Health1 Super Speciality Hospitals</span>
          </div>
          <div className="text-xs text-rlc-muted">
            &copy; {new Date().getFullYear()} H1N1 Super Speciality Hospitals Pvt. Ltd.
          </div>
        </div>
      </footer>
    </main>
  );
}
