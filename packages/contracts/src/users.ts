import { z } from 'zod';
import { CUSTOMER_TYPE, type UserRole, type CustomerType } from './enums';

// Same GSTIN format the providers module validates: state code, PAN, entity
// digit, 'Z', checksum.
const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Not a valid GSTIN');

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
  // Completed trips only. A pending or cancelled booking is not a trip taken,
  // and this is the number the home screen puts next to the customer's name.
  totalTrips: number;
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
    // B2B. The customers table holding these existed from the start and was
    // unreachable from any endpoint, so a business customer had no way to give
    // us the details their own invoice needs.
    customerType: z.enum(CUSTOMER_TYPE).optional(),
    companyName: z.string().trim().min(2).max(160).optional(),
    gstin: gstinSchema.optional(),
  })
  // Company details only mean something on a business account. Storing them
  // against an individual would leave data nothing ever reads.
  .refine((b) => b.customerType === 'business' || (!b.companyName && !b.gstin), {
    path: ['customerType'],
    message: 'Set customerType to "business" to store company details',
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export type UpdateMeBody = z.infer<typeof updateMeBody>;
