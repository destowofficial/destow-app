import { z } from 'zod';
import type { ProviderStatus } from './enums';

// A provider as its owner sees it. `status` is deliberately exposed here (unlike
// user status): a partner must be able to see they are pending approval, or the
// app can only show them an empty dashboard with no explanation.
export interface ProviderProfile {
  id: string;
  agencyName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  gstin: string | null;
  status: ProviderStatus;
  ratingAvg: number | null;
  ratingCount: number;
  createdAt: string;
}

// India's GSTIN: 2-digit state code, 10-char PAN, entity digit, 'Z', checksum.
// Optional at registration - a small operator may not be registered - but if one
// is supplied it must be well-formed rather than silently stored as junk that
// only fails much later at invoicing.
const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Not a valid GSTIN');

export const registerProviderBody = z.object({
  agencyName: z.string().trim().min(2).max(160),
  contactPhone: z.string().trim().min(8).max(15).optional(),
  contactEmail: z.string().trim().email().max(254).toLowerCase().optional(),
  gstin: gstinSchema.optional(),
});

export type RegisterProviderBody = z.infer<typeof registerProviderBody>;
