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
}: SendTemplateParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const body: Record<string, any> = {
      apiKey: process.env.AISENSY_API_KEY,
      campaignName,
      destination: destination.replace(/^\+/, ''),
      userName: userName || 'RoboLapCon',
      templateParams,
      source: 'robolapcon-website',
      buttons: [],
    };
    if (mediaUrl) {
      // AiSensy v2 expects media as an object, not a flat mediaUrl string
      body.media = {
        url: mediaUrl,
        filename: 'qr-pass.png',
      };
    }
    const res = await fetch(`${AISENSY_API_BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `AiSensy ${res.status}: ${text}` };
    }

    const data = await res.json();
    return { success: true, messageId: data.data?.messageId || data.messageId };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
