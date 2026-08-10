// How long a vehicle is held for a trip whose return the customer never states.
//
// Destow sells round trips but no longer asks for a return date: people extend
// by a day and mountain passes close, so a typed return was a guess presented
// as a fact. The fare never depended on it - that is settled from the odometer
// - but the vehicle's availability window does, or a car would be offered to
// somebody else while it was still eight hundred kilometres away.
//
// So it is estimated from the route the maps provider actually returned: out
// and back, plus a day at the far end, rounded up to whole days. Generous on
// purpose. Holding a vehicle slightly too long costs one booking; releasing it
// too early strands a customer.
const DAY_MS = 86_400_000;
const REST_MS = DAY_MS;

export function provisionalReturn(pickup: Date, durationS: number): Date {
  const driving = durationS * 2 * 1000;
  const end = pickup.getTime() + driving + REST_MS;
  // Round up to the same hour on a later day, so a hold always covers a whole
  // final day rather than expiring mid-afternoon.
  const days = Math.ceil((end - pickup.getTime()) / DAY_MS);
  return new Date(pickup.getTime() + days * DAY_MS);
}
