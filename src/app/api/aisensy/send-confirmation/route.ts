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

export async function POST(req: NextRequest) {
  try {
    const { delegate_id, full_name, phone } = await req.json();

    if (!delegate_id || !full_name || !phone) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const sb = createServiceClient();

    const { data: delegate } = await sb.rpc('rlc_lookup_delegate', { p_delegate_id: delegate_id });
    const dayLabel = buildDayLabel(delegate?.day_attendance || []);

    const qrUrl = `${QR_API}?data=${encodeURIComponent(delegate_id)}&size=400x400&format=png`;

    const result = await sendAisensyTemplate({
      campaignName: 'rlc_registration_confirmation',
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

    return NextResponse.json({ success: result.success });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
