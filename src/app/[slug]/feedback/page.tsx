'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Stethoscope, CheckCircle2, Star, ArrowLeft } from 'lucide-react';

const RATINGS = [1, 2, 3, 4, 5];
const LABELS: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <label className="rlc-label mb-2 block">{label}</label>
      <div className="flex items-center gap-1">
        {RATINGS.map(r => (
          <button key={r} type="button"
            onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(0)}
            onClick={() => onChange(r)}
            className="p-1 transition-transform hover:scale-110">
            <Star className={`w-7 h-7 transition-colors ${r <= (hover || value) ? 'fill-rlc-amber text-rlc-amber' : 'text-rlc-border'}`} />
          </button>
        ))}
        {(hover || value) > 0 && (
          <span className="text-xs text-rlc-muted ml-2">{LABELS[hover || value]}</span>
        )}
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const delegateId = searchParams.get('d') || null;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    overall_rating: 0,
    surgery_quality: 0,
    venue_rating: 0,
    food_rating: 0,
    drylab_rating: 0,
    would_recommend: true,
    best_part: '',
    improve: '',
    attend_next_year: '',
    additional_comments: '',
  });

  useEffect(() => {
    const sb = createClient();
    sb.rpc('get_event_by_slug', { p_slug: slug }).then(({ data }) => {
      if (data) setEvent(data);
      setLoading(false);
    });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.overall_rating === 0) return;
    setSubmitting(true);
    try {
      const sb = createClient();
      await sb.rpc('rlc_submit_feedback', {
        p_event_id: event.id,
        p_delegate_id: delegateId,
        p_overall_rating: form.overall_rating,
        p_surgery_quality: form.surgery_quality || null,
        p_venue_rating: form.venue_rating || null,
        p_food_rating: form.food_rating || null,
        p_drylab_rating: form.drylab_rating || null,
        p_would_recommend: form.would_recommend,
        p_best_part: form.best_part.trim() || null,
        p_improve: form.improve.trim() || null,
        p_attend_next_year: form.attend_next_year || null,
        p_additional_comments: form.additional_comments.trim() || null,
      });
      setSuccess(true);
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-rlc-muted">Loading...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-rlc-muted">Event not found.</div>;

  if (success) return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center animate-fade-in-up">
        <div className="w-20 h-20 mx-auto rounded-full bg-rlc-accent/10 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-rlc-accent" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Thank You!</h1>
        <p className="text-rlc-muted mb-8">Your feedback is invaluable and will help us make the next edition even better.</p>
        <Link href={`/${slug}`} className="rlc-btn-outline"><ArrowLeft className="w-4 h-4" /> Back to {event.name}</Link>
      </div>
    </main>
  );

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
        <h1 className="text-3xl font-bold mt-4">How was {event.name}?</h1>
        <p className="text-rlc-muted mt-1">Your honest feedback helps us improve. Takes less than 2 minutes. Responses are anonymous.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
        <StarRating value={form.overall_rating} onChange={v => setForm(p => ({ ...p, overall_rating: v }))} label="Overall Experience *" />
        <StarRating value={form.surgery_quality} onChange={v => setForm(p => ({ ...p, surgery_quality: v }))} label="Live Surgery Quality" />
        <StarRating value={form.venue_rating} onChange={v => setForm(p => ({ ...p, venue_rating: v }))} label="Venue & Arrangements" />
        <StarRating value={form.food_rating} onChange={v => setForm(p => ({ ...p, food_rating: v }))} label="Food & Hospitality" />
        <StarRating value={form.drylab_rating} onChange={v => setForm(p => ({ ...p, drylab_rating: v }))} label="Dry Lab / Simulation (skip if not attended)" />

        <div>
          <label className="rlc-label">Would you recommend RoboLapCon to a colleague?</label>
          <div className="flex gap-3 mt-2">
            {[true, false].map(v => (
              <button key={String(v)} type="button"
                onClick={() => setForm(p => ({ ...p, would_recommend: v }))}
                className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-all ${form.would_recommend === v ? (v ? 'bg-rlc-accent/10 border-rlc-accent text-rlc-accent' : 'bg-rlc-red/10 border-rlc-red text-rlc-red') : 'border-rlc-border text-rlc-muted hover:border-rlc-accent/30'}`}>
                {v ? 'Yes, definitely' : 'Not really'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="rlc-label">What was the best part?</label>
          <textarea name="best_part" value={form.best_part} onChange={e => setForm(p => ({ ...p, best_part: e.target.value }))}
            className="rlc-input !h-20 resize-none" placeholder="e.g. The robotic hysterectomy was outstanding..." />
        </div>

        <div>
          <label className="rlc-label">What could we improve?</label>
          <textarea name="improve" value={form.improve} onChange={e => setForm(p => ({ ...p, improve: e.target.value }))}
            className="rlc-input !h-20 resize-none" placeholder="Be honest — we want to hear it." />
        </div>

        <div>
          <label className="rlc-label">Would you attend the next edition?</label>
          <div className="flex gap-2 mt-2">
            {['Definitely', 'Likely', 'Maybe', 'No'].map(opt => (
              <button key={opt} type="button"
                onClick={() => setForm(p => ({ ...p, attend_next_year: opt }))}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-all ${form.attend_next_year === opt ? 'bg-rlc-accent/10 border-rlc-accent text-rlc-accent' : 'border-rlc-border text-rlc-muted hover:border-rlc-accent/30'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="rlc-label">Anything else?</label>
          <textarea name="additional_comments" value={form.additional_comments} onChange={e => setForm(p => ({ ...p, additional_comments: e.target.value }))}
            className="rlc-input !h-20 resize-none" placeholder="Optional" />
        </div>

        {form.overall_rating === 0 && (
          <p className="text-xs text-rlc-amber">Please rate your overall experience to submit.</p>
        )}

        <button type="submit" disabled={submitting || form.overall_rating === 0}
          className="rlc-btn-amber w-full text-base !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </main>
  );
}
