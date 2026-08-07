import { env } from '../../../config/env.js';
import { shortCode } from '../../log/safe.js';
import { OtpSendError, type OtpDeliveryProvider } from './types.js';

export interface WhatsAppConfig {
  apiVersion: string;
  phoneNumberId: string | undefined;
  accessToken: string | undefined;
  templateName: string;
  templateLang: string;
}

// WhatsApp Cloud API (Meta). OTP goes through an approved AUTHENTICATION template:
// the code fills a body variable and the copy-code button parameter. Uses fetch
// (built into Bun) - no SDK, so swapping to a BSP later is just another provider.
//
// Config is taken in the constructor (defaulting to env) rather than read from
// env at call time, so a caller - including a test - can pin it explicitly.
export class WhatsAppCloudProvider implements OtpDeliveryProvider {
  readonly channel = 'whatsapp' as const;
  private readonly cfg: WhatsAppConfig;

  constructor(cfg: Partial<WhatsAppConfig> = {}) {
    this.cfg = {
      apiVersion: env.WHATSAPP_API_VERSION,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: env.WHATSAPP_ACCESS_TOKEN,
      templateName: env.WHATSAPP_TEMPLATE_NAME,
      templateLang: env.WHATSAPP_TEMPLATE_LANG,
      ...cfg,
    };
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const to = phone.replace(/\D/g, ''); // E.164 digits, country code, no '+'
    const url = `https://graph.facebook.com/${this.cfg.apiVersion}/${this.cfg.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.cfg.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: this.cfg.templateName,
          language: { code: this.cfg.templateLang },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
        },
      }),
    });
    if (!res.ok) {
      // Meta's error body echoes request detail (and can include the recipient),
      // so keep only the coarse type/code pair and drop the rest.
      const parsed = (await res.json().catch(() => null)) as {
        error?: { type?: string; code?: number };
      } | null;
      const reason = shortCode([parsed?.error?.type, parsed?.error?.code].filter(Boolean).join(':'));
      throw new OtpSendError('whatsapp', res.status, reason);
    }
  }
}
