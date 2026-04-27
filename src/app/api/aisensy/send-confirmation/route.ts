import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAisensyTemplate } from '@/lib/aisensy';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

export async function POST(req: NextRequest) {
  try {
    const { delegate_id, full_name, phone } = await req.json();

    if (!delegate_id || !full_name || !phone) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Generate QR code image URL (encodes delegate UUID)
    const qrUrl = `${QR_API}?data=${encodeURIComponent(delegate_id)}&size=400x400&format=png`;

    const result = await sendAisensyTemplate({
      campaignName: 'rlc_registration_confirmation',
      destination: phone,
      templateParams: [full_name, 'Day 1 & Day 2'],
      mediaUrl: qrUrl,
    });

    // Log to rlc_whatsapp_messages
    const sb = createServiceClient();
    await sb.from('rlc_whatsapp_messages').insert({
      delegate_id,
      delegate_phone: phone,
      delegate_name: full_name,
      message_kind: 'registration_confirmation',
      direction: 'out',
      template_variables: { full_name, day_label: 'Day 1 & Day 2' },
      status: result.success ? 'sent' : 'failed',
      aisensy_message_id: result.messageId || null,
      failure_reason: result.error || null,
    });

    return NextResponse.json({ success: result.success });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
