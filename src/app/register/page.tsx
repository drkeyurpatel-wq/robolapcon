'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Bot, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

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

const DAY1_ALL_TRACKS = ['gyn', 'uro', 'onco', 'bariatric'];
const DAY2_ALL_TRACKS = ['gen', 'gi'];

const EXPERIENCE_BANDS = [
  { value: '0_5_years', label: '0-5 years' },
  { value: '5_10_years', label: '5-10 years' },
  { value: '10_20_years', label: '10-20 years' },
  { value: '20_plus_years', label: '20+ years' },
];

const DIETARY_OPTIONS = [
  { value: 'no_restrictions', label: 'No Restrictions' },
  { value: 'jain', label: 'Jain' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'other', label: 'Other' },
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', city: '', hospital: '',
    mcr_number: '', specialty: '', specialty_other: '',
    years_of_experience: '', dietary: 'no_restrictions', dietary_other: '',
    attend_day1: true, attend_day2: true,
    drylab_interest: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim()) return setError('Full name is required.');
    if (!form.email.trim() || !form.email.includes('@')) return setError('Valid email is required.');
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) return setError('Valid phone number is required.');
    if (!form.specialty) return setError('Please select your specialty.');
    if (form.specialty === 'other' && !form.specialty_other.trim()) return setError('Please specify your specialty.');
    if (!form.attend_day1 && !form.attend_day2) return setError('Please select at least one day to attend.');

    // Auto-include all tracks for selected days
    const dayAttendance: { day: number; tracks: string[] }[] = [];
    if (form.attend_day1) dayAttendance.push({ day: 1, tracks: DAY1_ALL_TRACKS });
    if (form.attend_day2) dayAttendance.push({ day: 2, tracks: DAY2_ALL_TRACKS });

    setLoading(true);
    try {
      const sb = createClient();
      const { data, error: rpcError } = await sb.rpc('rlc_register_delegate_open', {
        p_full_name: form.full_name.trim(),
        p_phone: form.phone.trim(),
        p_email: form.email.trim().toLowerCase(),
        p_specialty: form.specialty as any,
        p_day_attendance: dayAttendance,
        p_hospital: form.hospital.trim() || null,
        p_city: form.city.trim() || null,
        p_mcr_number: form.mcr_number.trim() || null,
        p_specialty_other: form.specialty === 'other' ? form.specialty_other.trim() : null,
        p_years_of_experience: form.years_of_experience || null,
        p_dietary: form.dietary as any,
        p_dietary_other: form.dietary === 'other' ? form.dietary_other.trim() : null,
      });

      if (rpcError) { setError(rpcError.message || 'Registration failed.'); setLoading(false); return; }

      const result = data as any;
      if (!result?.success) { setError(result?.message || 'Registration failed.'); setLoading(false); return; }

      if (result.delegate_id) {
        // Set drylab interest if opted in
        if (form.drylab_interest) {
          sb.rpc('rlc_set_drylab_interest', {
            p_delegate_id: result.delegate_id,
            p_interest: true,
          }).then(() => {});
        }

        fetch('/api/aisensy/send-confirmation', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delegate_id: result.delegate_id, full_name: form.full_name.trim(), phone: form.phone.trim() }),
        }).catch(() => {});
      }

      setResultMsg(result.message || 'Registration confirmed!');
      setSuccess(true);
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-rlc-accent/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-rlc-accent" />
          </div>
          <h1 className="text-3xl font-bold mb-2">You&apos;re Registered!</h1>
          <p className="text-rlc-muted mb-8">{resultMsg}</p>
          <Link href="/" className="rlc-btn-outline"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto mb-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-rlc-muted hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-6 h-6 text-rlc-accent" />
          <span className="font-bold text-lg">ROBOLAP<span className="text-rlc-accent">CON</span> 2026</span>
        </div>
        <h1 className="text-3xl font-bold mt-4">Register as Delegate</h1>
        <p className="text-rlc-muted mt-1">Fill in your details below to secure your spot.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-5">
        <div>
          <label className="rlc-label">Full Name <span className="text-rlc-red">*</span></label>
          <input name="full_name" value={form.full_name} onChange={handleChange} className="rlc-input" placeholder="Dr. Full Name" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="rlc-label">Email <span className="text-rlc-red">*</span></label>
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
            {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {form.specialty === 'other' && (
          <div><label className="rlc-label">Specify Specialty <span className="text-rlc-red">*</span></label>
            <input name="specialty_other" value={form.specialty_other} onChange={handleChange} className="rlc-input" placeholder="Your specialty" /></div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="rlc-label">MCR Number</label>
            <input name="mcr_number" value={form.mcr_number} onChange={handleChange} className="rlc-input" placeholder="Optional" /></div>
          <div><label className="rlc-label">Experience</label>
            <select name="years_of_experience" value={form.years_of_experience} onChange={handleChange} className="rlc-select">
              <option value="">Select</option>
              {EXPERIENCE_BANDS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select></div>
        </div>

        {/* Day Selection — simple checkboxes */}
        <div>
          <label className="rlc-label">Which days will you attend? <span className="text-rlc-red">*</span></label>
          <div className="flex gap-4 mt-2">
            <label className="flex-1 rlc-card !p-4 cursor-pointer flex items-center gap-3 hover:border-rlc-accent/50 transition-colors">
              <input type="checkbox" checked={form.attend_day1} onChange={(e) => setForm((p) => ({ ...p, attend_day1: e.target.checked }))} className="w-5 h-5 rounded accent-rlc-accent shrink-0" />
              <div>
                <div className="font-semibold text-sm text-white">Day 1</div>
                <div className="text-xs text-rlc-accent">Gynecology &middot; Urology &middot; Oncology &middot; Bariatric</div>
              </div>
            </label>
            <label className="flex-1 rlc-card !p-4 cursor-pointer flex items-center gap-3 hover:border-rlc-amber/50 transition-colors">
              <input type="checkbox" checked={form.attend_day2} onChange={(e) => setForm((p) => ({ ...p, attend_day2: e.target.checked }))} className="w-5 h-5 rounded accent-rlc-amber shrink-0" />
              <div>
                <div className="font-semibold text-sm text-white">Day 2</div>
                <div className="text-xs text-rlc-amber">General Surgery &middot; GI Surgery</div>
              </div>
            </label>
          </div>
        </div>

        <label className="rlc-card !p-4 cursor-pointer flex items-start gap-3 hover:border-rlc-accent/50 transition-colors">
          <input type="checkbox" checked={form.drylab_interest} onChange={(e) => setForm((p) => ({ ...p, drylab_interest: e.target.checked }))} className="w-5 h-5 rounded accent-rlc-accent shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm text-white">SSI Mantra Robotic Simulation — Hands-on</div>
            <div className="text-xs text-rlc-muted mt-1">Opt in for a 10-minute hands-on session on the SSI Mantra simulation bus. Your time slot will be assigned at the registration desk during check-in.</div>
          </div>
        </label>

        <div>
          <label className="rlc-label">Dietary Preference</label>
          <select name="dietary" value={form.dietary} onChange={handleChange} className="rlc-select">
            {DIETARY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        {form.dietary === 'other' && (
          <div><label className="rlc-label">Specify Dietary Needs</label>
            <input name="dietary_other" value={form.dietary_other} onChange={handleChange} className="rlc-input" placeholder="Your dietary requirements" /></div>
        )}

        {error && <div className="bg-rlc-red/10 border border-rlc-red/30 rounded-lg px-4 py-3 text-sm text-rlc-red">{error}</div>}

        <button type="submit" disabled={loading} className="rlc-btn-amber w-full text-base !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Registering...</> : 'Complete Registration'}
        </button>

        <p className="text-xs text-rlc-muted text-center">By registering, you agree to receive conference updates via WhatsApp and email.</p>
      </form>
    </main>
  );
}
