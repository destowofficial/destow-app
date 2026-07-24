import type { OtpChannel } from '@destow/contracts';

// The channel union lives in @destow/contracts so the request contract and this
// registry share one source of truth - a client can never ask for a channel the
// server doesn't know about. 'log' is dev-only (prints the code). 'sms' is a
// reserved drop-in: add it to OTP_CHANNEL in contracts, add an otp/sms.ts
// provider, and register it in index.ts - nothing else changes.
export type { OtpChannel };

// Swappable OTP delivery. The auth flow only ever calls deliverOtp(); each
// channel is one small provider that turns (phone, code) into a sent message.
// A provider throws on a send-time failure so the orchestrator can fall back.
export interface OtpDeliveryProvider {
  readonly channel: OtpChannel;
  sendOtp(phone: string, code: string): Promise<void>;
}

// What a provider throws when a send fails. It deliberately carries only the
// channel, the upstream status and a sanitized short code - never the response
// body, which can echo our access token, the template contents or the recipient
// number. These errors get logged, so the safe form is the only form.
export class OtpSendError extends Error {
  readonly logSafeMessage: string;

  constructor(
    readonly channel: OtpChannel,
    readonly status: number,
    readonly reason?: string,
  ) {
    super(`OTP send failed via ${channel}`);
    this.name = 'OtpSendError';
    this.logSafeMessage = `OtpSendError(${channel}/${status}${reason ? `/${reason}` : ''})`;
  }
}
