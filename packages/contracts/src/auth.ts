import { z } from 'zod';
import { OTP_CLIENT } from './clients';

// Auth endpoint request contracts - shared by the API (validation) and the
// mobile app (typed calls). Response envelopes use the shared { success, data } shape.

export const phoneSchema = z.string().min(8).max(15);
export const PLATFORM = ['android', 'ios', 'web'] as const;
export type Platform = (typeof PLATFORM)[number];

export const requestOtpBody = z.object({ phone: phoneSchema });

export const verifyOtpBody = z.object({
  phone: phoneSchema,
  code: z.string().length(6),
  // Which app is asking. The service refuses to mint a session unless the user's
  // role matches this client, which is what keeps admins off the OTP path.
  client: z.enum(OTP_CLIENT),
  // Used only when creating a brand-new user; ignored for an existing one.
  name: z.string().min(1).max(120).optional(),
  // Optional device metadata - recorded on the session for the "logged-in devices" list.
  deviceId: z.string().max(200).optional(),
  deviceName: z.string().max(200).optional(),
  platform: z.enum(PLATFORM).optional(),
});

export const refreshBody = z.object({ refreshToken: z.string().min(10) });

export type RequestOtpBody = z.infer<typeof requestOtpBody>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBody>;
export type RefreshBody = z.infer<typeof refreshBody>;
