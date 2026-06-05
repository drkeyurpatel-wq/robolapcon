import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Registration is invite-gated via the 'OPEN' code and now lands delegates as
// 'pending'. NO WhatsApp is sent here — the confirmation + QR pass goes out only
// after the Health1 team approves the delegate (see admin Approve action, which
// calls /api/aisensy/send-confirmation).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name, phone, email, specialty, day_attendance,
      hospital, city, mcr_number, specialty_other,
      years_of_experience, dietary, dietary_other,
      drylab_interest,
    } = body || {};

    // Email is optional now; phone is the required, unique contact field.
    if (!full_name || !phone || !specialty || !day_attendance) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS', message: 'Required fields missing.' }, { status: 400 });
    }

    const sb = createServiceClient();

    const { data: rpcResult, error: rpcError } = await sb.rpc('rlc_register_delegate_open', {
      p_full_name: full_name,
      p_phone: phone,
      p_email: email ? String(email).toLowerCase() : null,
      p_specialty: specialty,
      p_day_attendance: day_attendance,
      p_hospital: hospital || null,
      p_city: city || null,
      p_mcr_number: mcr_number || null,
      p_specialty_other: specialty === 'other' ? specialty_other : null,
      p_years_of_experience: years_of_experience || null,
      p_dietary: dietary || 'no_restrictions',
      p_dietary_other: dietary === 'other' ? dietary_other : null,
    });

    if (rpcError) {
      console.error('[register] RPC error:', rpcError);
      return NextResponse.json({ success: false, error: 'RPC_ERROR', message: rpcError.message }, { status: 500 });
    }

    const result = rpcResult as any;

    // Already registered — treat as success from a UX standpoint. No WhatsApp.
    if (!result?.success && result?.error_code === 'ALREADY_REGISTERED' && result?.delegate_id) {
      return NextResponse.json({
        success: true,
        delegate_id: result.delegate_id,
        already_registered: true,
        message: "You're already registered for ROBOLAPCON 2026. We have your details on file.",
      });
    }

    if (!result?.success) {
      return NextResponse.json({
        success: false,
        error: result?.error_code || 'REGISTRATION_FAILED',
        message: result?.message || 'Registration failed. Please try again.',
      }, { status: 400 });
    }

    // Optional drylab interest
    if (drylab_interest && result.delegate_id) {
      await sb.rpc('rlc_set_drylab_interest', { p_delegate_id: result.delegate_id, p_interest: true });
    }

    // Silent — confirmation WhatsApp is deferred until approval.
    return NextResponse.json({
      success: true,
      delegate_id: result.delegate_id,
      days_registered: result.days_registered,
      tracks_count: result.tracks_count,
      message: result.message,
    });
  } catch (err) {
    console.error('[register] unhandled exception:', err);
    return NextResponse.json({ success: false, error: 'INTERNAL', message: 'Registration failed unexpectedly.' }, { status: 500 });
  }
}
