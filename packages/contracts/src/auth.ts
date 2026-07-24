import { z } from 'zod';

// Auth endpoint request contracts - shared by the API (validation) and the
// mobile app (typed calls). Response envelopes use the shared { success, data } shape.

export const phoneSchema = z.string().min(8).max(15);
export const PLATFORM = ['android', 'ios', 'web'] as const;
export type Platform = (typeof PLATFORM)[number];

// Channels the OTP can be delivered over. Declared here so the request contract
// and the server's provider registry share one source of truth and can't drift.
// 'log' is dev-only (prints the code); 'sms' is a reserved future slot.
export const OTP_CHANNEL = ['whatsapp', 'telegram', 'log'] as const;
export type OtpChannel = (typeof OTP_CHANNEL)[number];

// `channel` is optional: omitted means the server's default channel. Which
// channels are actually accepted is runtime-checked against the enabled set
// (GET /auth/channels), since that varies per deployment.
export const requestOtpBody = z.object({
  phone: phoneSchema,
  channel: z.enum(OTP_CHANNEL).optional(),
});

export const verifyOtpBody = z.object({
  phone: phoneSchema,
  code: z.string().length(6),
  // Optional device metadata - recorded on the session for the "logged-in devices" list.
  deviceId: z.string().max(200).optional(),
  deviceName: z.string().max(200).optional(),
  platform: z.enum(PLATFORM).optional(),
});

export const refreshBody = z.object({ refreshToken: z.string().min(10) });

export type RequestOtpBody = z.infer<typeof requestOtpBody>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBody>;
export type RefreshBody = z.infer<typeof refreshBody>;
