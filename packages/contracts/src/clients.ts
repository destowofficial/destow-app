import type { UserRole } from './enums';

// The three first-party clients. Every access token's `aud` is one of these, so
// a token minted for one app cannot be replayed against another.
export const CLIENT = ['customer_app', 'provider_app', 'admin_web'] as const;
export type Client = (typeof CLIENT)[number];

// The one role each client may hold a session for. This single mapping keeps a
// customer out of the partner app, a provider out of the customer app, and - the
// case that matters most - an admin out of both, since admins must clear 2FA.
export const CLIENT_ROLE: Record<Client, UserRole> = {
  customer_app: 'customer',
  provider_app: 'provider',
  admin_web: 'admin',
};

// Clients that may use the phone+OTP endpoints. admin_web is absent by design.
export const OTP_CLIENT = ['customer_app', 'provider_app'] as const;
export type OtpClient = (typeof OTP_CLIENT)[number];
