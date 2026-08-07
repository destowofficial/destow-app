import { z } from 'zod';
import type { UserRole, CustomerType } from './enums';

// The profile a user sees of themselves. Deliberately excludes `status`: a
// suspended account is rejected at login, so exposing the field here would only
// tell a banned user how they were classified.
export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
  customerType: CustomerType;
  companyName: string | null;
  gstin: string | null;
  createdAt: string;
}

// What a user may change about themselves. `role`, `status` and `phone` are
// absent by design: role is an admin action, status is a moderation action, and
// changing a phone number is a re-verification flow, not a profile edit.
// At least one field must be present so an empty body is a clear 422 rather
// than a silent no-op that looks like success.
export const updateMeBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().max(254).toLowerCase().optional(),
    avatarUrl: z.string().trim().url().max(2048).optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export type UpdateMeBody = z.infer<typeof updateMeBody>;
