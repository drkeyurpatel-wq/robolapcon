'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Calendar, MapPin, Stethoscope, QrCode } from 'lucide-react';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

export default function PassPage() {
  const { slug, delegateId } = useParams<{ slug: string; delegateId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [delegate, setDelegate] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [drylabSlot, setDrylabSlot] = useState<any>(null);
  const sb = createClient();

  useEffect(() => {
    sb.rpc('get_event_by_slug', { p_slug: slug }).then(({ data }) => { if (data) setEvent(data); });
    sb.rpc('rlc_lookup_delegate', { p_delegate_id: delegateId }).then(({ data }) => {
      if ((data as any)?.success) setDelegate(data);
    });
    sb.from('rlc_delegate_attendance').select('*').eq('delegate_id', delegateId)
      .order('day_number').then(({ data }) => setAttendance(data || []));
    sb.from('rlc_drylab_slots').select('*').eq('delegate_id', delegateId)
      .limit(1).single().then(({ data }) => { if (data) setDrylabSlot(data); });
  }, [slug, delegateId]);

  if (!event || !delegate) return <div className="min-h-screen flex items-center justify-center text-rlc-muted">Loading pass...</div>;

  const specialtyLabel = delegate.specialty === 'other'
    ? delegate.specialty_other || 'Other'
    : (delegate.specialty || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  const qrUrl = `${QR_API}?data=${encodeURIComponent(delegateId)}&size=400x400&format=png&color=00A99D&bgcolor=0f172a`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-sm mx-auto">
        {/* Badge card */}
        <div className="rounded-3xl overflow-hidden border border-rlc-border bg-gradient-to-b from-rlc-bg-card to-rlc-bg">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center border-b border-rlc-border/50" style={{ background: `linear-gradient(135deg, ${event.theme_accent}15, ${event.theme_amber}10)` }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: event.theme_accent }}>DELEGATE PASS</p>
            <h1 className="text-xl font-black mt-1">{event.name}</h1>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-rlc-muted">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(event.start_date)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue_city}</span>
            </div>
          </div>

          {/* Delegate info */}
          <div className="px-6 py-5 text-center">
            <h2 className="text-2xl font-bold text-white">{delegate.full_name}</h2>
            <p className="text-sm mt-1" style={{ color: event.theme_accent }}>{specialtyLabel}</p>
            {delegate.hospital && <p className="text-sm text-rlc-muted mt-0.5">{delegate.hospital}</p>}
            {delegate.city && <p className="text-xs text-rlc-muted">{delegate.city}</p>}
          </div>

          {/* QR */}
          <div className="px-6 pb-4 flex justify-center">
            <div className="bg-white rounded-2xl p-3">
              <img src={qrUrl} alt="Badge QR" className="w-40 h-40" />
            </div>
          </div>
          <p className="text-center text-[10px] text-rlc-muted pb-2">Show this QR at check-in, food & gift counters</p>

          {/* Attendance */}
          <div className="px-6 pb-4">
            <div className="flex gap-2">
              {attendance.map(a => (
                <div key={a.id} className="flex-1 rounded-xl bg-rlc-bg-light p-3 text-center">
                  <p className="text-xs font-semibold text-white">Day {a.day_number}</p>
                  <p className="text-[10px] text-rlc-muted mt-0.5">{(a.tracks || []).join(', ')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Drylab slot */}
          {(delegate.drylab_interest || drylabSlot) && (
            <div className="px-6 pb-4">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${event.theme_accent}15`, border: `1px solid ${event.theme_accent}30` }}>
                <p className="text-xs font-semibold" style={{ color: event.theme_accent }}>★ SSI Mantra Simulation</p>
                {drylabSlot ? (
                  <p className="text-sm font-bold text-white mt-1">
                    Day {drylabSlot.day_number} · {drylabSlot.start_time?.slice(0, 5)} – {drylabSlot.end_time?.slice(0, 5)}
                  </p>
                ) : (
                  <p className="text-xs text-rlc-muted mt-1">Slot will be assigned at check-in</p>
                )}
              </div>
            </div>
          )}

          {/* Scans status */}
          {delegate.scans && delegate.scans.length > 0 && (
            <div className="px-6 pb-5">
              <div className="flex flex-wrap gap-2 justify-center">
                {delegate.scans.map((s: any, i: number) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-rlc-accent/10 text-rlc-accent">
                    ✓ {s.type} D{s.day}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 border-t border-rlc-border/50 text-center">
            <p className="text-[10px] text-rlc-muted">{event.organizer_name}</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-4 flex gap-3">
          <a href={`/${slug}/live`} className="flex-1 rlc-btn-primary !py-3 text-center text-sm">Join Live</a>
          <a href={`/${slug}`} className="flex-1 rlc-btn-outline !py-3 text-center text-sm">Schedule</a>
        </div>
      </div>
    </main>
  );
}
