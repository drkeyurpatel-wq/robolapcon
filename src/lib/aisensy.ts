const AISENSY_API_BASE = 'https://backend.aisensy.com/campaign/t1/api/v2';

interface SendTemplateParams {
  campaignName: string;
  destination: string;
  templateParams: string[];
  userName?: string;
  mediaUrl?: string;
}

export async function sendAisensyTemplate({
  campaignName,
  destination,
  templateParams,
  userName,
  mediaUrl,
}: SendTemplateParams): Promise<{ success: boolean; messageId?: string; error?: string; debug?: any }> {
  try {
    const body: Record<string, any> = {
      apiKey: process.env.AISENSY_API_KEY,
      campaignName,
      destination: destination.replace(/^\+/, ''),
      userName: userName || 'RoboLapCon',
      templateParams,
      source: 'robolapcon-website',
    };
    if (mediaUrl) {
      // AiSensy v2 expects media as an object, not a flat mediaUrl string
      body.media = {
        url: mediaUrl,
        filename: 'qr-pass.png',
      };
    }

    const sentBody = { ...body, apiKey: '***REDACTED***' };

    const res = await fetch(`${AISENSY_API_BASE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();

    if (!res.ok) {
      return {
        success: false,
        error: `AiSensy ${res.status}: ${responseText}`,
        debug: { sentBody, responseStatus: res.status, responseText },
      };
    }

    let data: any = null;
    try { data = JSON.parse(responseText); } catch {}

    return {
      success: true,
      messageId: data?.data?.messageId || data?.messageId || data?.submitted_message_id || null,
      debug: { sentBody, responseStatus: res.status, responseText },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
