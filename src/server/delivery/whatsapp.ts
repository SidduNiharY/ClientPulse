export interface WhatsAppProvider {
  sendDocument(input: {
    to: string;
    filename: string;
    pdfBuffer: Buffer;
    message: string;
  }): Promise<{ providerId: string }>;
}

export class HttpWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly endpoint: string,
    private readonly token: string | undefined
  ) {}

  async sendDocument(input: {
    to: string;
    filename: string;
    pdfBuffer: Buffer;
    message: string;
  }) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: JSON.stringify({
        to: input.to,
        filename: input.filename,
        message: input.message,
        pdfBase64: input.pdfBuffer.toString("base64")
      })
    });

    if (!response.ok) {
      throw new Error(`WhatsApp provider failed with ${response.status}`);
    }

    const body = (await response.json().catch(() => ({}))) as {
      providerId?: string;
      messageId?: string;
      id?: string;
    };

    return {
      providerId: body.providerId ?? body.messageId ?? body.id ?? ""
    };
  }
}

export function createWhatsAppProviderFromEnv(): WhatsAppProvider {
  const endpoint = process.env.WHATSAPP_API_URL;

  if (!endpoint) {
    throw new Error("WhatsApp delivery requires WHATSAPP_API_URL");
  }

  return new HttpWhatsAppProvider(endpoint, process.env.WHATSAPP_API_TOKEN);
}

export async function sendReportWhatsApp(
  input: {
    to: string;
    filename: string;
    pdfBuffer: Buffer;
    message: string;
  },
  provider: WhatsAppProvider = createWhatsAppProviderFromEnv()
) {
  return provider.sendDocument(input);
}
