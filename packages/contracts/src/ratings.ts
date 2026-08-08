import { z } from 'zod';

export const createRatingBody = z.object({
  // Whole stars only. A 4.5 would have to be rounded somewhere, and the
  // provider average is computed from the sum, so half-stars would drift.
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(1000).optional(),
});

export interface BookingRating {
  bookingId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export type CreateRatingBody = z.infer<typeof createRatingBody>;
