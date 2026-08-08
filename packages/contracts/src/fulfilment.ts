import { z } from 'zod';
import { BOOKING_STATUS } from './enums';

export const assignDriverBody = z.object({ driverId: z.string().uuid() });
export const providerBookingsQuery = z.object({
  status: z.enum(BOOKING_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type AssignDriverBody = z.infer<typeof assignDriverBody>;
