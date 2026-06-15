'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Stethoscope, CheckCircle2, ArrowLeft, Loader2, CalendarDays, Phone } from 'lucide-react';

const SPECIALTIES = [
  { value: 'general_surgery', label: 'General Surgery' },
  { value: 'surgical_gastroenterology', label: 'Surgical Gastroenterology' },
  { value: 'urology', label: 'Urology' },
  { value: 'gynecology_obstetrics', label: 'Gynecology & Obstetrics' },
  { value: 'surgical_oncology', label: 'Surgical Oncology' },
  { value: 'colorectal_surgery', label: 'Colorectal Surgery' },
  { value: 'bariatric_surgery', label: 'Bariatric Surgery' },
  { value: 'pediatric_surgery', label: 'Pediatric Surgery' },
  { value: 'thoracic_surgery', label: 'Thoracic Surgery' },
  { value: 'other', label: 'Other' },
];
const EXPERIENCE = [
  { value: '0_5_years', label: '0-5 years' },
  { value: '5_10_years', label: '5-10 years' },
  { value: '10_20_years', label: '10-20 years' },
  { value: '20_plus_years', label: '20+ years' },
];
const DIETARY = [
  { value: 'no_restrictions', label: 'No Restrictions' },
  { value: 'jain', label: 'Jain / Swaminarayan' },
  { value: 'other', label: 'Other' },
];

export default function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', city: '', hospital: '',
    mcr_number: '', specialty: '', specialty_other: '',
    years_of_experience: '', dietary: 'no_restrictions', dietary_other: '',
    attend_day1: false, attend_day2: false, drylab_interest: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  useEffect(() => {
    const sb = createClient();
    sb.rpc('get_event_by_slug', { p_slug: slug }).then(({ data }) => {
      if (data) {
        setEvent(data);
        sb.from('rlc_tracks').select('code, display_name, day_number')
          .eq('event_id', (data as any).id).eq('active', true)
          .order('day_number').order('display_order')
          .then(({ data: t }) => setTracks(t || []));
      }
      setLoading(false);
    });
  }, [slug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim()) return setError('Full name is required.');
    if (form.email.trim() && !form.email.includes('@')) return setError('Please enter a valid email, or leave it blank.');
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) return setError('Valid phone required.');
    if (!form.specialty) return setError('Please select your specialty.');
    if (form.specialty === 'other' && !form.specialty_other.trim()) return setError('Please specify your specialty.');
    if (!form.attend_day1 && !form.attend_day2) return setError('Please select at least one day.');

    const day1Tracks = tracks.filter(t => t.day_number === 1).map(t => t.code);
    const day2Tracks = tracks.filter(t => t.day_number === 2).map(t => t.code);
    const dayAttendance: any[] = [];
    if (form.attend_day1 && day1Tracks.length) dayAttendance.push({ day: 1, tracks: day1Tracks });
    if (form.attend_day2 && day2Tracks.length) dayAttendance.push({ day: 2, tracks: day2Tracks });
    if (!dayAttendance.length) return setError('No tracks available for selected days.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() ? form.email.trim().toLowerCase() : null,
          specialty: form.specialty,
          day_attendance: dayAttendance,
          hospital: form.hospital.trim() || null,
          city: form.city.trim() || null,
          mcr_number: form.mcr_number.trim() || null,
          specialty_other: form.specialty === 'other' ? form.specialty_other.trim() : null,
          years_of_experience: form.years_of_experience || null,
          dietary: form.dietary,
          dietary_other: form.dietary === 'other' ? form.dietary_other.trim() : null,
          drylab_interest: !!form.drylab_interest,
        }),
      });

      const result = await res.json().catch(() => ({ success: false, message: 'Network error. Please try again.' }));

      if (!result?.success) {
        setError(result?.message || 'Registration failed.');
        setSubmitting(false);
        return;
      }

      // Success — could be a fresh registration OR already_registered (treated as success)
      setResultMsg(result.message || 'Registration confirmed!');
      if (result.delegate_id) {
        try {
          localStorage.setItem('rlc_delegate', JSON.stringify({ id: result.delegate_id, name: form.full_name.trim() }));
        } catch {}
      }
      setSuccess(true);
    } catch { setError('Something went wrong.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-rlc-muted">Loading...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-rlc-muted">Event not found.</div>;
  if (!event.registration_open) return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 text-center">
      <div className="max-w-md w-full animate-fade-in-up">
        <div className="w-20 h-20 mx-auto rounded-full bg-rlc-accent/10 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-rlc-accent" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Registration Closed</h1>
        <p className="text-rlc-muted mb-2">Thank you for the overwhelming response — we are now closed for registration.</p>
        <p className="text-rlc-muted mb-6">For any questions or spot registration, please feel free to call us.</p>
        <a href="tel:+918141625967" className="rlc-btn-amber !py-3 justify-center inline-flex mb-4">
          <Phone className="w-4 h-4" /> +91 81416 25967
        </a>
        <p className="text-rlc-muted mb-8">Thank you.</p>
        <div>
          <Link href={`/${slug}`} className="rlc-btn-outline"><ArrowLeft className="w-4 h-4" /> Back to Event</Link>
        </div>
      </div>
    </main>
  );

  if (success) return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center animate-fade-in-up">
        <div className="w-20 h-20 mx-auto rounded-full bg-rlc-accent/10 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-rlc-accent" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Thank You for Registering!</h1>
        <p className="text-rlc-muted mb-8">{resultMsg}</p>
        <div className="flex flex-col gap-3">
          <Link href={`/${slug}#schedule`} className="rlc-btn-outline !py-3 justify-center">
            <CalendarDays className="w-4 h-4" /> Explore Schedule & Faculty
          </Link>
        </div>
      </div>
    </main>
  );

  const day1Tracks = tracks.filter(t => t.day_number === 1);
  const day2Tracks = tracks.filter(t => t.day_number === 2);

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto mb-8">
        <Link href={`/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-rlc-muted hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to {event.name}
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Stethoscope className="w-6 h-6 text-rlc-accent" />
          <span className="font-bold text-lg">Health<span className="text-rlc-accent">1</span> Events</span>
        </div>
        <h1 className="text-3xl font-bold mt-4">Register for {event.name}</h1>
        <p className="text-rlc-muted mt-1">Fill in your details below to secure your spot.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-5">
        <div>
          <label className="rlc-label">Full Name <span className="text-rlc-red">*</span></label>
          <input name="full_name" value={form.full_name} onChange={handleChange} className="rlc-input" placeholder="Dr. Full Name" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="rlc-label">Email <span className="text-rlc-muted text-xs">(optional)</span></label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="rlc-input" placeholder="doctor@example.com" /></div>
          <div><label className="rlc-label">Phone <span className="text-rlc-red">*</span></label>
            <input name="phone" value={form.phone} onChange={handleChange} className="rlc-input" placeholder="+91 98765 43210" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="rlc-label">City</label>
            <input name="city" value={form.city} onChange={handleChange} className="rlc-input" placeholder="Ahmedabad" /></div>
          <div><label className="rlc-label">Hospital / Institution</label>
            <input name="hospital" value={form.hospital} onChange={handleChange} className="rlc-input" placeholder="Optional" /></div>
        </div>
        <div>
          <label className="rlc-label">Specialty <span className="text-rlc-red">*</span></label>
          <select name="specialty" value={form.specialty} onChange={handleChange} className="rlc-select">
            <option value="">Select specialty</option>
            {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {form.specialty === 'other' && (
          <div><label className="rlc-label">Specify Specialty <span className="text-rlc-red">*</span></label>
            <input name="specialty_other" value={form.specialty_other} onChange={handleChange} className="rlc-input" placeholder="Your specialty" /></div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="rlc-label">GMC Registration Number</label>
            <input name="mcr_number" value={form.mcr_number} onChange={handleChange} className="rlc-input" placeholder="Optional" /></div>
          <div><label className="rlc-label">Experience</label>
            <select name="years_of_experience" value={form.years_of_experience} onChange={handleChange} className="rlc-select">
              <option value="">Select</option>
              {EXPERIENCE.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select></div>
        </div>

        {/* Day selection */}
        <div>
          <label className="rlc-label">Which days? <span className="text-rlc-red">*</span></label>
          <div className="flex gap-4 mt-2">
            {day1Tracks.length > 0 && (
              <label className="flex-1 rlc-card !p-4 cursor-pointer flex items-center gap-3 hover:border-rlc-accent/50 transition-colors">
                <input type="checkbox" checked={form.attend_day1} onChange={e => setForm(p => ({ ...p, attend_day1: e.target.checked }))} className="w-5 h-5 rounded accent-rlc-accent shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-white">Day 1</div>
                  <div className="text-xs text-rlc-accent">{day1Tracks.map(t => t.display_name).join(' · ')}</div>
                </div>
              </label>
            )}
            {day2Tracks.length > 0 && (
              <label className="flex-1 rlc-card !p-4 cursor-pointer flex items-center gap-3 hover:border-rlc-amber/50 transition-colors">
                <input type="checkbox" checked={form.attend_day2} onChange={e => setForm(p => ({ ...p, attend_day2: e.target.checked }))} className="w-5 h-5 rounded accent-rlc-amber shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-white">Day 2</div>
                  <div className="text-xs text-rlc-amber">{day2Tracks.map(t => t.display_name).join(' · ')}</div>
                </div>
              </label>
            )}
          </div>
        </div>

        <label className="rlc-card !p-4 cursor-pointer flex items-start gap-3 hover:border-rlc-accent/50 transition-colors">
          <input type="checkbox" checked={form.drylab_interest} onChange={e => setForm(p => ({ ...p, drylab_interest: e.target.checked }))} className="w-5 h-5 rounded accent-rlc-accent shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm text-white">SSI Mantra Robotic Simulation — Hands-on</div>
            <div className="text-xs text-rlc-muted mt-1">10-minute hands-on session. Slot assigned at check-in.</div>
          </div>
        </label>

        <div>
          <label className="rlc-label">Dietary Preference</label>
          <select name="dietary" value={form.dietary} onChange={handleChange} className="rlc-select">
            {DIETARY.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        {form.dietary === 'other' && (
          <div><label className="rlc-label">Specify</label>
            <input name="dietary_other" value={form.dietary_other} onChange={handleChange} className="rlc-input" /></div>
        )}

        {error && <div className="bg-rlc-red/10 border border-rlc-red/30 rounded-lg px-4 py-3 text-sm text-rlc-red">{error}</div>}

        <button type="submit" disabled={submitting} className="rlc-btn-amber w-full text-base !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Registering...</> : 'Complete Registration'}
        </button>
        <p className="text-xs text-rlc-muted text-center">By registering, you agree to receive conference updates via WhatsApp and email.</p>
      </form>
    </main>
  );
}
