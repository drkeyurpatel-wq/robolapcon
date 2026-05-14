import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAisensyTemplate } from '@/lib/aisensy';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

function buildDayLabel(dayAttendance: any[]): string {
  if (!Array.isArray(dayAttendance) || dayAttendance.length === 0) return 'Both Days — Sat 20 & Sun 21 June';
  const days = dayAttendance.map((d: any) => d.day);
  const hasDay1 = days.includes(1);
  const hasDay2 = days.includes(2);
  if (hasDay1 && hasDay2) return 'Both Days — Sat 20 & Sun 21 June';
  if (hasDay1) return 'Saturday, 20 June';
  if (hasDay2) return 'Sunday, 21 June';
  return 'Both Days — Sat 20 & Sun 21 June';
}

// Fire-and-log WhatsApp send. Always writes a log row, even on failure.
// Does NOT throw — caller decides what to do with the result.
async function sendWhatsAppConfirmation(
  sb: ReturnType<typeof createServiceClient>,
  delegate_id: string,
  full_name: string,
  phone: string,
  dayLabel: string
): Promise<{ success: boolean; error?: string }> {
  const qrUrl = `${QR_API}?data=${encodeURIComponent(delegate_id)}&size=400x400&format=png`;

  let result: any;
  try {
    result = await sendAisensyTemplate({
      campaignName: 'rlc_registration_confirmation',
      destination: phone,
      templateParams: [full_name, dayLabel],
      mediaUrl: qrUrl,
    });
  } catch (err) {
    result = { success: false, error: `Exception: ${String(err)}`, debug: { exception: String(err) } };
  }

  const debugStr = JSON.stringify(result?.debug || {});
  const failureReason = result?.error
    ? `${result.error} | DEBUG: ${debugStr}`
    : `OK | DEBUG: ${debugStr}`;

  // ALWAYS log — never swallow this failure silently
  try {
    await sb.from('rlc_whatsapp_messages').insert({
      delegate_id,
      delegate_phone: phone,
      delegate_name: full_name,
      message_kind: 'registration_confirmation',
      direction: 'out',
      template_variables: { full_name, day_label: dayLabel, qr_url: qrUrl },
      status: result?.success ? 'sent' : 'failed',
      aisensy_message_id: result?.messageId || null,
      failure_reason: failureReason,
    });
  } catch (logErr) {
    // Even logging failed. At least surface to Vercel logs.
    console.error('[register] failed to insert whatsapp log row:', logErr);
  }

  return { success: !!result?.success, error: result?.error };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name, phone, email, specialty, day_attendance,
      hospital, city, mcr_number, specialty_other,
      years_of_experience, dietary, dietary_other,
      drylab_interest,
    } = body || {};

    if (!full_name || !phone || !email || !specialty || !day_attendance) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS', message: 'Required fields missing.' }, { status: 400 });
    }

    const sb = createServiceClient();

    // 1. Run the registration RPC
    const { data: rpcResult, error: rpcError } = await sb.rpc('rlc_register_delegate_open', {
      p_full_name: full_name,
      p_phone: phone,
      p_email: email.toLowerCase(),
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
    const dayLabel = buildDayLabel(day_attendance);

    // 2. Handle "already registered" gracefully — return success with delegate_id
    //    so the client can route to the pass page instead of showing an error.
    if (!result?.success && result?.error_code === 'ALREADY_REGISTERED' && result?.delegate_id) {
      // Re-send the WhatsApp confirmation in case they lost the original
      await sendWhatsAppConfirmation(sb, result.delegate_id, full_name, phone, dayLabel);
      return NextResponse.json({
        success: true, // success from UX perspective: they have a pass
        delegate_id: result.delegate_id,
        already_registered: true,
        message: 'Welcome back! You\'re already registered — we\'ve resent your WhatsApp confirmation.',
      });
    }

    // 3. Other RPC failures (validation, internal, etc) — return as-is
    if (!result?.success) {
      return NextResponse.json({
        success: false,
        error: result?.error_code || 'REGISTRATION_FAILED',
        message: result?.message || 'Registration failed. Please try again.',
      }, { status: 400 });
    }

    // 4. Success path — set drylab interest if needed
    if (drylab_interest && result.delegate_id) {
      await sb.rpc('rlc_set_drylab_interest', { p_delegate_id: result.delegate_id, p_interest: true });
    }

    // 5. Send WhatsApp confirmation server-side (NOT client-side — survives tab close)
    const wa = await sendWhatsAppConfirmation(sb, result.delegate_id, full_name, phone, dayLabel);

    return NextResponse.json({
      success: true,
      delegate_id: result.delegate_id,
      days_registered: result.days_registered,
      tracks_count: result.tracks_count,
      message: result.message,
      whatsapp_sent: wa.success,
    });
  } catch (err) {
    console.error('[register] unhandled exception:', err);
    return NextResponse.json({ success: false, error: 'INTERNAL', message: 'Registration failed unexpectedly.' }, { status: 500 });
  }
}
