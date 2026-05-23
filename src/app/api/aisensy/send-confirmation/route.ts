import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAisensyTemplate } from '@/lib/aisensy';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

/**
 * Build human day label from an attendance array.
 *
 * Accepts EITHER shape (the two callers in this codebase pass different shapes):
 *   - DB row shape:        [{ day_number: 1 }, { day_number: 2 }]
 *   - Request body shape:  [{ day: 1 }, { day: 2 }]
 *
 * Throws if neither key is present on any item — we'd rather fail loud than
 * silently default to "Both Days" and send wrong info to a delegate.
 */
function buildDayLabel(dayAttendance: any[]): string {
  if (!Array.isArray(dayAttendance) || dayAttendance.length === 0) {
    throw new Error('buildDayLabel: empty/invalid dayAttendance');
  }

  const days = dayAttendance.map((d: any) => {
    const n = d?.day_number ?? d?.day;
    if (n !== 1 && n !== 2) {
      throw new Error(`buildDayLabel: unrecognised shape ${JSON.stringify(d)}`);
    }
    return n;
  });

  const hasDay1 = days.includes(1);
  const hasDay2 = days.includes(2);
  if (hasDay1 && hasDay2) return 'Both Days — Sat 20 & Sun 21 June';
  if (hasDay1) return 'Saturday, 20 June';
  if (hasDay2) return 'Sunday, 21 June';
  // unreachable given check above, but TS-safe
  throw new Error('buildDayLabel: no valid days found');
}

export async function POST(req: NextRequest) {
  try {
    const { delegate_id, full_name, phone } = await req.json();

    if (!delegate_id || !full_name || !phone) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const sb = createServiceClient();

    // Query rlc_delegate_attendance directly — rlc_lookup_delegate does NOT
    // return day_attendance, which caused 2 delegates to receive wrong day
    // info on a backfill on 23 May 2026. See commit log.
    const { data: attendanceRows, error: attErr } = await sb
      .from('rlc_delegate_attendance')
      .select('day_number')
      .eq('delegate_id', delegate_id);

    if (attErr) {
      return NextResponse.json({ error: `Attendance lookup failed: ${attErr.message}` }, { status: 500 });
    }

    if (!attendanceRows || attendanceRows.length === 0) {
      return NextResponse.json({
        error: 'No attendance rows for this delegate. Cannot determine day label.',
      }, { status: 400 });
    }

    let dayLabel: string;
    try {
      dayLabel = buildDayLabel(attendanceRows);
    } catch (e) {
      return NextResponse.json({ error: `day_label build failed: ${String(e)}` }, { status: 500 });
    }

    const qrUrl = `${QR_API}?data=${encodeURIComponent(delegate_id)}&size=400x400&format=png`;

    const result = await sendAisensyTemplate({
      campaignName: 'rlc_registration_confirmation_final',
      destination: phone,
      templateParams: [full_name, dayLabel],
      mediaUrl: qrUrl,
    });

    // ALWAYS log the debug info — success or fail — so we can inspect what AiSensy returned
    const debugStr = JSON.stringify(result.debug || {});
    const failureReason = result.error
      ? `${result.error} | DEBUG: ${debugStr}`
      : `OK | DEBUG: ${debugStr}`;

    await sb.from('rlc_whatsapp_messages').insert({
      delegate_id,
      delegate_phone: phone,
      delegate_name: full_name,
      message_kind: 'registration_confirmation',
      direction: 'out',
      template_variables: { full_name, day_label: dayLabel, qr_url: qrUrl },
      status: result.success ? 'sent' : 'failed',
      aisensy_message_id: result.messageId || null,
      failure_reason: failureReason,
    });

    return NextResponse.json({ success: result.success, day_label: dayLabel });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
