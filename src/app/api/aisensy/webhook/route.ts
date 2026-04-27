import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // AiSensy sends status updates with messageId and status
    const messageId = body.messageId || body.data?.messageId;
    const status = body.status || body.data?.status;

    if (!messageId || !status) {
      return NextResponse.json({ ok: true }); // Ack anyway
    }

    const sb = createServiceClient();
    await sb
      .from('rlc_whatsapp_messages')
      .update({ status: status.toLowerCase() })
      .eq('aisensy_message_id', messageId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Always 200 for webhooks
  }
}
