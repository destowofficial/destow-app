import { z } from 'zod';
import { BOOKING_STATUS } from './enums';

export const assignDriverBody = z.object({ driverId: z.string().uuid() });
export const providerBookingsQuery = z.object({ status: z.enum(BOOKING_STATUS).optional() });

export type AssignDriverBody = z.infer<typeof assignDriverBody>;
