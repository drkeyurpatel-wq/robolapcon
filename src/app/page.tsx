'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Calendar, MapPin, ChevronRight, Bot, Microscope, MonitorPlay,
  Users, MessageSquare, Coffee, Clock, ArrowRight, Play, Zap, Target,
  Layers, CircuitBoard, Tv, Shield, Radio,
} from 'lucide-react';
import { RoboLapConLogo, RoboLapConFullLogo } from '@/components/RoboLapConLogo';

/* ── Conference Config ───────────────────────────────── */
const CONF = {
  name: 'RoboLapCon 2026',
  tagline: 'Live Robotic & 3D Laparoscopic Surgery Conference',
  dates: '20 – 21 June 2026',
  dateStart: new Date('2026-06-20T14:30:00+05:30'),
  venue: 'Ahmedabad',
  slug: 'robolapcon-2026',
  liveSurgeries: 12,
  delegates: '200+',
  faculty: '10+',
  tracks: 2,
};

const DAY1_SCHEDULE = [
  { time: '14:30', title: 'Registration & Afternoon Tea', type: 'break' },
  { time: '15:00', title: 'Robotic Nephrectomy', sub: 'Dr. Keval Patel · Urology · SSI Mantra', type: 'live', highlight: true },
  { time: '16:15', title: 'Laparoscopic Bariatric Surgery', sub: 'Dr. Mahendra Narwaria · Bariatric', type: 'live', highlight: true },
  { time: '16:30', title: 'Inauguration Ceremony', type: 'ceremony' },
  { time: '17:30', title: 'Robotic Hysterectomy', sub: 'Dr. Smit Solanki · Gynecology · SSI Mantra', type: 'live', highlight: true },
  { time: '17:30', title: 'Laparoscopic Gynecological Surgery', sub: 'Dr. Dipak Limbachiya · Gynecology', type: 'live', highlight: true },
  { time: '19:30', title: 'Robotic Surgical Oncology', sub: 'To Be Announced · SSI Mantra', type: 'live', highlight: true },
  { time: '19:30', title: 'Oncoplastic Breast Surgery', sub: 'Dr. Anagha Zope · Surgical Oncology', type: 'recorded', highlight: true },
  { time: '21:00', title: 'Dinner & Networking', type: 'dinner' },
];

const DAY2_SCHEDULE = [
  { time: '08:00', title: 'Registration & Breakfast', type: 'break' },
  { time: '08:30', title: 'Inauguration — Day 2', type: 'ceremony' },
  { time: '08:30', title: 'Recorded Address — Dr Srivastava', type: 'ceremony' },
  { time: '09:00', title: 'Robotic TAPP — Inguinal Hernia Repair', sub: 'Dr. Krunal Solanki · General Surgery · SSI Mantra', type: 'live', highlight: true },
  { time: '09:00', title: 'Laparoscopic ETEP — Incisional Hernia Repair', sub: 'Dr. Sameer Rege · General Surgery', type: 'live', highlight: true },
  { time: '10:30', title: 'Lecture', sub: 'To Be Announced', type: 'lecture' },
  { time: '11:00', title: 'Robotic Cholecystectomy', sub: 'Dr. Milind Akhani · GI / HPB · SSI Mantra', type: 'live', highlight: true },
  { time: '11:00', title: 'Laparoscopic Nissen Fundoplication', sub: 'Dr. Manoranjan Kushwaha · General Surgery', type: 'live', highlight: true },
  { time: '12:30', title: 'Critical Circle of Fundoplication — Uniform Wraps', sub: 'Dr. Kalpesh Jani', type: 'recorded', highlight: true },
  { time: '13:00', title: 'Lunch', type: 'break' },
  { time: '14:00', title: 'Robotic Bariatric Surgery', sub: 'Dr. Digvijaysingh Bedi · Bariatric · SSI Mantra', type: 'live', highlight: true },
  { time: '14:00', title: 'Laparoscopic ETEP — Inguinal Hernia Repair', sub: 'Dr. Krunal Solanki · General Surgery', type: 'live', highlight: true },
  { time: '15:30', title: 'Laparoscopic PTEP — Umbilical Hernia Repair', sub: 'Dr. Sameer Rege · General Surgery', type: 'live', highlight: true },
  { time: '16:30', title: 'Panel Discussion + Interactive Q&A', type: 'panel' },
  { time: '17:00', title: 'High Tea', type: 'break' },
];

const FEATURES = [
  { icon: Bot, title: 'SSI Mantra 3.0', desc: 'India\'s indigenous surgical robot — live in action from our OT', color: 'accent' },
  { icon: Layers, title: '3D Laparoscopy', desc: 'Advanced 3D visualization systems for precision surgery', color: 'accent' },
  { icon: Tv, title: '12 Live Surgeries', desc: 'Watch cutting-edge procedures beamed live from the operating theatre across 2 days', color: 'amber' },
  { icon: Microscope, title: 'Robotic Simulation Lab', desc: 'Hands-on training with expert mentors and SSI Mantra simulation setups', color: 'amber' },
  { icon: Users, title: 'Expert Faculty', desc: '10+ national faculty across general surgery, GI, urology, gynecology, oncology and bariatric surgery', color: 'accent' },
  { icon: MessageSquare, title: 'Interactive Case Discussions', desc: 'Live Q&A and panel discussions with operating faculty after each case', color: 'amber' },
];

/* ── Countdown Hook ──────────────────────────────────── */
function useCountdown(target: Date) {
  const [diff, setDiff] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    const tick = () => {
      const ms = target.getTime() - Date.now();
      if (ms <= 0) { setDiff({ days: 0, hours: 0, mins: 0, secs: 0 }); return; }
      setDiff({
        days: Math.floor(ms / 86400000),
        hours: Math.floor((ms % 86400000) / 3600000),
        mins: Math.floor((ms % 3600000) / 60000),
        secs: Math.floor((ms % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return diff;
}

/* ── Intersection Observer Hook ──────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Main Page ───────────────────────────────────────── */
export default function HomePage() {
  const countdown = useCountdown(CONF.dateStart);
  const aboutSection = useInView();
  const featuresSection = useInView();
  const mantraSection = useInView();
  const lapSection = useInView();
  const scheduleSection = useInView();
  const ctaSection = useInView();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const iconColor = (c: string) => c === 'accent' ? 'text-rlc-accent' : 'text-rlc-amber';
  const iconBg = (c: string) => c === 'accent' ? 'bg-rlc-accent/10' : 'bg-rlc-amber/10';

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-rlc-bg/70 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RoboLapConLogo size={36} />
            <div className="hidden sm:block">
              <span className="font-bold text-base tracking-tight text-rlc-accent">RoboLap</span>
              <span className="font-bold text-base tracking-tight text-rlc-amber">Con</span>
              <span className="text-white/40 text-xs ml-1.5 font-medium">2026</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#features" className="hover:text-white transition-colors">Highlights</a>
            <a href="#schedule" className="hover:text-white transition-colors">Schedule</a>
            <a href="#faculty" className="hover:text-white transition-colors">Faculty</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${CONF.slug}/live`}
              className="rlc-btn-outline text-sm !py-2 !px-4 hidden sm:inline-flex"
            >
              <Radio className="w-3.5 h-3.5" /> Live
            </Link>
            <Link
              href={`/${CONF.slug}/register`}
              className="rlc-btn-amber text-sm !py-2 !px-5 group"
            >
              Register <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Layered backgrounds */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(#00A99D 1px, transparent 1px), linear-gradient(90deg, #00A99D 1px, transparent 1px)',
              backgroundSize: '80px 80px',
              transform: `translateY(${scrollY * 0.1}px)`,
            }}
          />
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-rlc-accent/[0.08] rounded-full blur-[150px]" />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-rlc-amber/[0.06] rounded-full blur-[150px]" />
          <div
            className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03]"
            style={{
              background: 'linear-gradient(135deg, transparent 30%, #00A99D 50%, transparent 70%)',
              transform: `translateY(${scrollY * -0.05}px)`,
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-rlc-accent/20 bg-rlc-accent/[0.06] text-rlc-accent text-sm font-medium mb-8 animate-fade-in-up">
            <Zap className="w-3.5 h-3.5" />
            Live from Health1 Hospitals, Shilaj, Ahmedabad
          </div>

          <div className="flex justify-center mb-6 animate-fade-in-up animate-delay-100">
            <RoboLapConLogo size={120} />
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-3 animate-fade-in-up animate-delay-200">
            <span className="text-rlc-accent">RoboLap</span>
            <span className="text-rlc-amber">Con</span>
          </h1>
          <div className="text-white/30 text-lg sm:text-xl font-bold tracking-[0.3em] mb-6 animate-fade-in-up animate-delay-200">
            2 0 2 6
          </div>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-fade-in-up animate-delay-300">
            {CONF.tagline}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/50 mb-12 animate-fade-in-up animate-delay-300">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rlc-accent" />
              <span className="text-white font-semibold">{CONF.dates}</span>
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rlc-amber" />
              <span className="text-white font-semibold">{CONF.venue}</span>
            </span>
          </div>

          {/* Countdown */}
          <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-lg mx-auto mb-12 animate-fade-in-up animate-delay-400">
            {[
              { v: countdown.days, l: 'Days' },
              { v: countdown.hours, l: 'Hours' },
              { v: countdown.mins, l: 'Mins' },
              { v: countdown.secs, l: 'Secs' },
            ].map((c) => (
              <div key={c.l} className="relative group">
                <div className="absolute inset-0 bg-rlc-accent/10 rounded-xl blur-sm group-hover:bg-rlc-accent/15 transition-colors" />
                <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-xl py-4 sm:py-5 px-2">
                  <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                    {String(c.v).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] sm:text-xs text-white/40 uppercase tracking-wider mt-1">{c.l}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animate-delay-500">
            <Link
              href={`/${CONF.slug}/register`}
              className="rlc-btn-amber text-base !px-10 !py-4 group shadow-lg shadow-rlc-amber/20"
            >
              Register Now
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#schedule" className="rlc-btn-outline text-base !px-10 !py-4">
              View Schedule
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <div className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="relative py-6 border-y border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '12', label: 'Live Surgeries', color: 'text-rlc-accent' },
              { value: '10+', label: 'Expert Faculty', color: 'text-white' },
              { value: '200+', label: 'Delegates', color: 'text-white' },
              { value: '2', label: 'Days of Learning', color: 'text-rlc-amber' },
            ].map((s) => (
              <div key={s.label}>
                <div className={`text-3xl sm:text-4xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ABOUT ═══ */}
      <section
        id="about"
        ref={aboutSection.ref}
        className={`py-20 sm:py-28 px-4 sm:px-6 transition-all duration-1000 ${aboutSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-rlc-accent text-sm font-semibold uppercase tracking-widest mb-4">About the conference</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6">
            Where <span className="text-rlc-accent">precision surgery</span> meets{' '}
            <span className="text-rlc-amber">innovation</span>
          </h2>
          <p className="text-white/50 text-lg max-w-3xl mx-auto leading-relaxed">
            RoboLapCon 2026 brings together India&apos;s top surgeons for two days of live robotic and
            3D laparoscopic surgeries, hands-on workshops, and expert panel discussions — all live from
            Health1 Super Speciality Hospitals&apos; state-of-the-art operating theatres in Ahmedabad.
          </p>
        </div>
      </section>

      {/* ═══ SSI MANTRA FEATURE ═══ */}
      <section
        ref={mantraSection.ref}
        className={`py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden transition-all duration-1000 ${mantraSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-rlc-accent/[0.04] to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="relative group">
              <div className="absolute -inset-4 bg-rlc-accent/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/[0.08] bg-rlc-bg-light">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/operating-theatre.jpg"
                  alt="Robotic surgery operating theatre"
                  className="w-full h-full object-cover opacity-80"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rlc-bg via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rlc-accent/20 backdrop-blur-sm rounded-lg text-rlc-accent text-sm font-medium border border-rlc-accent/20">
                    <Bot className="w-4 h-4" />
                    SSI Mantra 3.0 — Made in India
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-rlc-accent text-sm font-semibold uppercase tracking-widest mb-3">Featured technology</div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                SSI Mantra 3.0<br />
                <span className="text-white/40 text-xl font-normal">India&apos;s indigenous surgical robot</span>
              </h2>
              <p className="text-white/50 leading-relaxed mb-6">
                Watch India&apos;s first CDSCO-certified robotic surgical system in action — live from our
                operating theatre. The SSI Mantra 3.0 brings world-class robotic precision at a fraction
                of the cost of imported systems, making robotic surgery accessible across India.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Target, label: 'Sub-millimetre precision' },
                  { icon: Shield, label: 'CDSCO certified' },
                  { icon: CircuitBoard, label: '3D HD vision system' },
                  { icon: Zap, label: 'Haptic feedback' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm text-white/60">
                    <f.icon className="w-4 h-4 text-rlc-accent shrink-0" />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 3D LAPAROSCOPY FEATURE ═══ */}
      <section
        ref={lapSection.ref}
        className={`py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden transition-all duration-1000 ${lapSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-l from-rlc-amber/[0.03] to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1">
              <div className="text-rlc-amber text-sm font-semibold uppercase tracking-widest mb-3">Advanced visualization</div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                3D Laparoscopy<br />
                <span className="text-white/40 text-xl font-normal">Depth perception that changes surgery</span>
              </h2>
              <p className="text-white/50 leading-relaxed mb-6">
                Experience the leap from 2D to 3D laparoscopic surgery. Our 4K 3D visualization
                systems provide true stereoscopic depth perception, dramatically improving precision
                in complex procedures — live demonstrations across multiple specialties.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Layers, label: 'True stereoscopic 3D' },
                  { icon: Tv, label: '4K ultra-HD resolution' },
                  { icon: Target, label: 'Enhanced depth perception' },
                  { icon: Microscope, label: 'Multi-specialty demos' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm text-white/60">
                    <f.icon className="w-4 h-4 text-rlc-amber shrink-0" />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative group order-1 md:order-2">
              <div className="absolute -inset-4 bg-rlc-amber/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/[0.08] bg-rlc-bg-light">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/surgical-tech.jpg"
                  alt="Advanced 3D laparoscopic surgery setup"
                  className="w-full h-full object-cover opacity-80"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rlc-bg via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rlc-amber/20 backdrop-blur-sm rounded-lg text-rlc-amber text-sm font-medium border border-rlc-amber/20">
                    <Layers className="w-4 h-4" />
                    4K 3D Laparoscopic System
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES / HIGHLIGHTS ═══ */}
      <section
        id="features"
        ref={featuresSection.ref}
        className={`py-20 sm:py-28 px-4 sm:px-6 transition-all duration-1000 ${featuresSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-rlc-accent text-sm font-semibold uppercase tracking-widest mb-4">What to expect</div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Two days of <span className="text-rlc-amber">surgical excellence</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="group relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-colors h-full">
                  <div className={`w-11 h-11 rounded-xl ${iconBg(f.color)} flex items-center justify-center mb-4`}>
                    <f.icon className={`w-5 h-5 ${iconColor(f.color)}`} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SCHEDULE ═══ */}
      <section
        id="schedule"
        ref={scheduleSection.ref}
        className={`py-20 sm:py-28 px-4 sm:px-6 relative transition-all duration-1000 ${scheduleSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="absolute inset-0 bg-white/[0.01]" />
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-14">
            <div className="text-rlc-accent text-sm font-semibold uppercase tracking-widest mb-4">Full programme</div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">Schedule</h2>
            <p className="text-white/40">12 live surgeries + 2 recorded cases across 2 days + SSI Mantra Simulation Bus</p>
          </div>

          {/* DAY 1 */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-bold uppercase tracking-widest text-rlc-accent">Day 1</span>
              <span className="text-sm text-white/40">Sat 20 June · 2:30 PM – 9 PM</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rlc-accent/10 text-rlc-accent border border-rlc-accent/20">Super-Specialty</span>
            </div>
            <div className="space-y-1.5">
              {DAY1_SCHEDULE.map((s, i) => (
                <div
                  key={`d1-${i}`}
                  className={`flex gap-4 items-start p-3.5 rounded-xl border transition-all duration-300 ${
                    s.highlight
                      ? 'bg-rlc-accent/[0.06] border-rlc-accent/20 hover:border-rlc-accent/40'
                      : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="w-14 shrink-0 text-right pt-0.5">
                    <span className={`text-sm font-mono ${s.highlight ? 'text-rlc-accent font-semibold' : 'text-white/40'}`}>
                      {s.time}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {s.highlight && <span className="shrink-0 w-2 h-2 rounded-full bg-rlc-accent animate-pulse" />}
                      <span className={`font-medium ${s.highlight ? 'text-white' : 'text-white/60'}`}>{s.title}</span>
                    </div>
                    {s.sub && <p className="text-xs text-white/35 mt-0.5 ml-4">{s.sub}</p>}
                  </div>
                  {s.type === 'live' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      Live
                    </span>
                  )}
                  {s.type === 'dinner' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rlc-amber/10 text-rlc-amber border border-rlc-amber/20">
                      Networking
                    </span>
                  )}
                  {s.type === 'recorded' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rlc-amber/10 text-rlc-amber border border-rlc-amber/20">
                      Recorded
                    </span>
                  )}
                  {s.type === 'lecture' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rlc-accent/10 text-rlc-accent border border-rlc-accent/20">
                      Lecture
                    </span>
                  )}
                  {s.type === 'panel' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/[0.06] text-white/60 border border-white/10">
                      Panel
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* DAY 2 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-bold uppercase tracking-widest text-rlc-amber">Day 2</span>
              <span className="text-sm text-white/40">Sun 21 June · 8 AM – 5 PM</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rlc-amber/10 text-rlc-amber border border-rlc-amber/20">General & GI Surgery</span>
            </div>
            <div className="space-y-1.5">
              {DAY2_SCHEDULE.map((s, i) => (
                <div
                  key={`d2-${i}`}
                  className={`flex gap-4 items-start p-3.5 rounded-xl border transition-all duration-300 ${
                    s.highlight
                      ? 'bg-rlc-amber/[0.04] border-rlc-amber/20 hover:border-rlc-amber/40'
                      : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="w-14 shrink-0 text-right pt-0.5">
                    <span className={`text-sm font-mono ${s.highlight ? 'text-rlc-amber font-semibold' : 'text-white/40'}`}>
                      {s.time}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {s.highlight && <span className="shrink-0 w-2 h-2 rounded-full bg-rlc-amber animate-pulse" />}
                      <span className={`font-medium ${s.highlight ? 'text-white' : 'text-white/60'}`}>{s.title}</span>
                    </div>
                    {s.sub && <p className="text-xs text-white/35 mt-0.5 ml-4">{s.sub}</p>}
                  </div>
                  {s.type === 'live' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      Live
                    </span>
                  )}
                  {s.type === 'lecture' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rlc-accent/10 text-rlc-accent border border-rlc-accent/20">
                      Lecture
                    </span>
                  )}
                  {s.type === 'panel' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/[0.06] text-white/60 border border-white/10">
                      Panel
                    </span>
                  )}
                  {s.type === 'recorded' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rlc-amber/10 text-rlc-amber border border-rlc-amber/20">
                      Recorded
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Simulation Lab note */}
          <div className="p-4 rounded-xl border border-rlc-accent/20 bg-rlc-accent/[0.04]">
            <div className="flex items-center gap-3">
              <Microscope className="w-5 h-5 text-rlc-accent shrink-0" />
              <div>
                <span className="font-semibold text-white text-sm">SSI Mantra Robotic Simulation Lab — Hands-on</span>
                <p className="text-xs text-white/40 mt-0.5">Both days · 10-min slots assigned during registration</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FACULTY ═══ */}
      <section id="faculty" className="py-24 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-rlc-accent/10 text-rlc-accent rounded-full text-xs font-semibold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-rlc-accent"></span>
              Confirmed Faculty
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Faculty</h2>
            <p className="text-white/60 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              India&apos;s leading robotic and laparoscopic surgeons across <span className="text-white font-semibold">general surgery, GI/HPB, urology, gynecology, surgical oncology and bariatric surgery</span> — performing live surgeries and delivering expert lectures across 2 days.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {[
              { name: 'Dr. Keval Patel',         role: 'Urosurgeon' },
              { name: 'Dr. Mahendra Narwaria',    role: 'Bariatric Surgeon' },
              { name: 'Dr. Milind Akhani',        role: 'GI, HPB & Liver Transplant Surgeon' },
              { name: 'Dr. Krunal Solanki',       role: 'General Surgeon' },
              { name: 'Dr. Manoranjan Kushwaha',  role: 'General Surgeon' },
              { name: 'Dr. Smit Solanki',         role: 'Gynec Surgeon' },
              { name: 'Dr. Sameer Rege',          role: 'General Surgeon' },
              { name: 'Dr. Digvijaysingh Bedi',  role: 'Bariatric Surgeon' },
              { name: 'Dr. Anagha Zope',          role: 'Breast Oncoplastic Surgeon' },
              { name: 'Dr. Dipak Limbachiya',     role: 'Laparoscopic Gynec Surgeon' },
              { name: 'Dr. Kalpesh Jani',         role: 'Laparoscopic & GI Surgeon' },
            ].map((f) => (
              <div key={f.name} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-rlc-accent/30 hover:bg-white/[0.04] transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rlc-accent/30 to-rlc-amber/20 flex items-center justify-center mb-3 text-base font-bold text-white">
                  {f.name.replace('Dr. ', '').split(' ').map(p => p[0]).slice(0, 2).join('')}
                </div>
                <p className="text-sm font-semibold text-white leading-tight">{f.name}</p>
                <p className="text-xs text-white/50 mt-1 leading-snug">{f.role}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-5 text-center">
              <div className="text-3xl font-bold text-rlc-accent">10+</div>
              <div className="text-[11px] text-white/40 mt-1 uppercase tracking-wider">Faculty</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-5 text-center">
              <div className="text-3xl font-bold text-rlc-accent">14</div>
              <div className="text-[11px] text-white/40 mt-1 uppercase tracking-wider">Surgical Cases</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-5 text-center">
              <div className="text-3xl font-bold text-rlc-accent">6</div>
              <div className="text-[11px] text-white/40 mt-1 uppercase tracking-wider">Specialties</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ REGISTER CTA ═══ */}
      <section
        ref={ctaSection.ref}
        className={`py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden transition-all duration-1000 ${ctaSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rlc-accent/[0.06] rounded-full blur-[150px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="flex justify-center mb-6">
            <RoboLapConLogo size={60} />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Secure your spot
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
            Limited to {CONF.delegates} delegates. Join India&apos;s premier robotic and laparoscopic surgery conference.
          </p>
          <Link
            href={`/${CONF.slug}/register`}
            className="inline-flex items-center gap-3 px-12 py-5 bg-rlc-amber text-rlc-bg font-bold text-lg rounded-xl hover:brightness-110 hover:shadow-xl hover:shadow-rlc-amber/25 transition-all duration-300 group"
          >
            Register Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <div className="mt-6 text-sm text-white/30">
            {CONF.dates} &middot; {CONF.venue} &middot; {CONF.liveSurgeries} Live Surgeries &middot; 2 Tracks
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.06] py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <RoboLapConLogo size={32} />
              <div>
                <div className="text-sm font-semibold">
                  <span className="text-rlc-accent">RoboLap</span>
                  <span className="text-rlc-amber">Con</span>
                  <span className="text-white/40 ml-1">2026</span>
                </div>
                <div className="text-xs text-white/30">A Health1 Initiative</div>
              </div>
            </div>
            <div className="text-xs text-white/30 text-center md:text-right">
              Organised by Health1 Super Speciality Hospitals, Shilaj, Ahmedabad<br />
              &copy; {new Date().getFullYear()} H1N1 Super Speciality Hospitals Pvt. Ltd.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
