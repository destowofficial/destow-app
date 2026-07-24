import { env } from '../../../config/env.js';
import { shortCode } from '../../log/safe.js';
import { OtpSendError, type OtpDeliveryProvider } from './types.js';

// Telegram Gateway API - delivers a verification code addressed by phone number
// (unlike the Bot API, no chat_id / prior /start needed). We supply our own code;
// Telegram just delivers it. Charged per delivery; the ttl refunds the fee if the
// message isn't delivered in the window. Docs: https://core.telegram.org/gateway/api
export interface TelegramConfig {
  gatewayToken: string | undefined;
  senderUsername: string | undefined;
}

// Config comes in via the constructor (defaulting to env) so a caller - including
// a test - can pin it explicitly instead of depending on load-time env.
export class TelegramGatewayProvider implements OtpDeliveryProvider {
  readonly channel = 'telegram' as const;
  private readonly cfg: TelegramConfig;

  constructor(cfg: Partial<TelegramConfig> = {}) {
    this.cfg = {
      gatewayToken: env.TELEGRAM_GATEWAY_TOKEN,
      senderUsername: env.TELEGRAM_SENDER_USERNAME,
      ...cfg,
    };
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    // Gateway wants E.164 with the leading '+'.
    const phoneNumber = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
    const res = await fetch('https://gatewayapi.telegram.org/sendVerificationMessage', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.cfg.gatewayToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        code, // our server-generated 6-digit code (Gateway accepts 4-8 digits)
        ttl: 300, // 5 min, matches the OTP TTL; fee refunded if undelivered in window
        ...(this.cfg.senderUsername ? { sender_username: this.cfg.senderUsername } : {}),
      }),
    });
    // Success is { ok: true, result: RequestStatus }; failure is a non-2xx or
    // { ok: false, error }. Treat either signal as a send failure. Only the
    // short error token is kept - never the raw body (it echoes the recipient).
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || data.ok === false || data.error) {
      throw new OtpSendError('telegram', res.status, shortCode(data.error));
    }
  }
}
