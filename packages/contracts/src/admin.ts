import { z } from 'zod';
import { USER_ROLE, PROVIDER_STATUS } from './enums';
import { OTP_CHANNEL } from './auth';

export const adminLoginBody = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
  // Length only - the policy is enforced when a password is SET, not when one is
  // presented. Rejecting a short password at login would confirm it was wrong
  // before the hash is even checked.
  password: z.string().min(1).max(128),
});

export const adminVerifyBody = z.object({
  challengeToken: z.string().min(20).max(200),
  code: z.string().length(6),
});

export const setUserRoleBody = z.object({ role: z.enum(USER_ROLE) });
export const setProviderStatusBody = z.object({ status: z.enum(PROVIDER_STATUS) });
export const setAdminPasswordBody = z.object({ password: z.string().min(12).max(128) });

export const otpSettingsBody = z.object({
  channels: z.array(z.enum(OTP_CHANNEL)).min(1),
  defaultChannel: z.enum(OTP_CHANNEL),
  fallbackChannel: z.enum(OTP_CHANNEL).nullish(),
});

export type AdminLoginBody = z.infer<typeof adminLoginBody>;
export type AdminVerifyBody = z.infer<typeof adminVerifyBody>;
export type OtpSettingsBody = z.infer<typeof otpSettingsBody>;
