import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAisensyTemplate } from '@/lib/aisensy';

export async function POST(req: NextRequest) {
  try {
    const { delegate_id, full_name, phone } = await req.json();

    if (!delegate_id || !full_name || !phone) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const result = await sendAisensyTemplate({
      campaignName: 'rlc_registration_confirmation',
      destination: phone,
      templateParams: [full_name, 'Day 1 & Day 2'],
    });

    // Log to rlc_whatsapp_messages
    const sb = createServiceClient();
    await sb.from('rlc_whatsapp_messages').insert({
      delegate_id,
      template_name: 'rlc_registration_confirmation',
      phone,
      status: result.success ? 'sent' : 'failed',
      aisensy_message_id: result.messageId || null,
      error_message: result.error || null,
    });

    return NextResponse.json({ success: result.success });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
