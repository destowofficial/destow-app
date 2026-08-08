import type { BookingStatus } from '@destow/contracts';
import { AppError } from '../http/errors.js';

// The booking lifecycle, as data rather than scattered if-statements. Every
// transition in the product is listed here, so an illegal one (pending straight
// to completed, reviving a cancelled trip) is impossible rather than merely
// unhandled.
//
//   pending --accept--> confirmed --assign--> assigned --start--> ongoing --complete--> completed
//      |                    |                     |
//      +--------------------+---------------------+------> cancelled
//
// completed and cancelled are terminal: money has either been earned or not, and
// re-opening a trip after the fact would rewrite that answer.
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['assigned', 'cancelled'],
  assigned: ['ongoing', 'cancelled'],
  // A trip already under way cannot be cancelled - the vehicle is on the road
  // with the customer in it. Anything after this is a refund conversation.
  ongoing: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw AppError.conflict(`A ${from} booking cannot become ${to}`);
  }
}
