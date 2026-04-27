'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Bot, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

const SPECIALITIES = [
  'General Surgery',
  'Gynaecology',
  'Urology',
  'Oncology',
  'Bariatric Surgery',
  'GI Surgery',
  'Surgical Gastroenterology',
  'Colorectal Surgery',
  'Paediatric Surgery',
  'Cardiothoracic Surgery',
  'Neurosurgery',
  'Orthopaedics',
  'ENT',
  'Other',
];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir',
  'Ladakh','Chandigarh','Puducherry','Other',
];

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  speciality: string;
  mci_number: string;
  hospital_name: string;
  designation: string;
  dietary_preference: string;
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormData>({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    state: 'Gujarat',
    speciality: '',
    mci_number: '',
    hospital_name: '',
    designation: '',
    dietary_preference: 'veg',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [regNumber, setRegNumber] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.full_name.trim()) return setError('Full name is required.');
    if (!form.email.trim() || !form.email.includes('@'))
      return setError('Valid email is required.');
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10)
      return setError('Valid phone number is required.');
    if (!form.city.trim()) return setError('City is required.');
    if (!form.speciality) return setError('Please select your speciality.');

    setLoading(true);

    try {
      const sb = createClient();
      const { data, error: rpcError } = await sb.rpc(
        'rlc_register_delegate_open',
        {
          p_full_name: form.full_name.trim(),
          p_email: form.email.trim().toLowerCase(),
          p_phone: form.phone.trim(),
          p_city: form.city.trim(),
          p_state: form.state,
          p_speciality: form.speciality,
          p_mci_number: form.mci_number.trim() || null,
          p_hospital_name: form.hospital_name.trim() || null,
          p_designation: form.designation.trim() || null,
          p_dietary_preference: form.dietary_preference || null,
        }
      );

      if (rpcError) {
        if (rpcError.message?.includes('already registered')) {
          setError('This email or phone is already registered.');
        } else {
          setError(rpcError.message || 'Registration failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      const delegateId = data;

      // Fire AiSensy confirmation (non-blocking)
      fetch('/api/aisensy/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegate_id: delegateId,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
        }),
      }).catch(() => {});

      // Get registration number
      const { data: delegate } = await sb
        .from('rlc_delegates')
        .select('registration_number')
        .eq('id', delegateId)
        .single();

      setRegNumber(delegate?.registration_number || delegateId);
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-rlc-accent/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-rlc-accent" />
          </div>
          <h1 className="text-3xl font-bold mb-2">You&apos;re Registered!</h1>
          <p className="text-rlc-muted mb-6">
            Welcome to ROBOLAPCON 2026. Your registration number is:
          </p>
          <div className="inline-block px-6 py-3 bg-rlc-bg-card border border-rlc-accent/30 rounded-xl mb-6">
            <span className="text-2xl font-bold text-rlc-accent font-mono">
              {regNumber}
            </span>
          </div>
          <p className="text-sm text-rlc-muted mb-8">
            A confirmation message will be sent to your WhatsApp shortly.
          </p>
          <Link href="/" className="rlc-btn-outline">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4">
      {/* Header */}
      <div className="max-w-lg mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-rlc-muted hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-6 h-6 text-rlc-accent" />
          <span className="font-bold text-lg">
            ROBOLAP<span className="text-rlc-accent">CON</span> 2026
          </span>
        </div>
        <h1 className="text-3xl font-bold mt-4">Register as Delegate</h1>
        <p className="text-rlc-muted mt-1">
          Fill in your details below to secure your spot.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-5">
        {/* Name */}
        <div>
          <label className="rlc-label">
            Full Name <span className="text-rlc-red">*</span>
          </label>
          <input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            className="rlc-input"
            placeholder="Dr. Full Name"
          />
        </div>

        {/* Email + Phone */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="rlc-label">
              Email <span className="text-rlc-red">*</span>
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="rlc-input"
              placeholder="doctor@example.com"
            />
          </div>
          <div>
            <label className="rlc-label">
              Phone <span className="text-rlc-red">*</span>
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="rlc-input"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {/* City + State */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="rlc-label">
              City <span className="text-rlc-red">*</span>
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="rlc-input"
              placeholder="Ahmedabad"
            />
          </div>
          <div>
            <label className="rlc-label">
              State <span className="text-rlc-red">*</span>
            </label>
            <select
              name="state"
              value={form.state}
              onChange={handleChange}
              className="rlc-select"
            >
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Speciality */}
        <div>
          <label className="rlc-label">
            Speciality <span className="text-rlc-red">*</span>
          </label>
          <select
            name="speciality"
            value={form.speciality}
            onChange={handleChange}
            className="rlc-select"
          >
            <option value="">Select speciality</option>
            {SPECIALITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* MCI + Hospital */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="rlc-label">MCI/NMC Number</label>
            <input
              name="mci_number"
              value={form.mci_number}
              onChange={handleChange}
              className="rlc-input"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="rlc-label">Hospital / Institution</label>
            <input
              name="hospital_name"
              value={form.hospital_name}
              onChange={handleChange}
              className="rlc-input"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Designation */}
        <div>
          <label className="rlc-label">Designation</label>
          <input
            name="designation"
            value={form.designation}
            onChange={handleChange}
            className="rlc-input"
            placeholder="e.g. Consultant, Resident, HOD"
          />
        </div>

        {/* Dietary */}
        <div>
          <label className="rlc-label">Dietary Preference</label>
          <select
            name="dietary_preference"
            value={form.dietary_preference}
            onChange={handleChange}
            className="rlc-select"
          >
            <option value="veg">Vegetarian</option>
            <option value="non-veg">Non-Vegetarian</option>
            <option value="jain">Jain</option>
            <option value="vegan">Vegan</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rlc-red/10 border border-rlc-red/30 rounded-lg px-4 py-3 text-sm text-rlc-red">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="rlc-btn-amber w-full text-base !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Registering...
            </>
          ) : (
            'Complete Registration'
          )}
        </button>

        <p className="text-xs text-rlc-muted text-center">
          By registering, you agree to receive conference updates via WhatsApp and email.
        </p>
      </form>
    </main>
  );
}
