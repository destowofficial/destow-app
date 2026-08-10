// The from/to catalogue and the routes people actually book. Both are read-only
// to clients; cities are admin-curated and popular routes are observed.
export interface City {
  id: string;
  name: string;
  state: string;
}

export interface PopularRoute {
  from: string;
  to: string;
  bookings: number;
  // The routed distance for the round trip, and the cheapest fare anyone has
  // actually been charged on it. Both come from bookings already taken rather
  // than a fresh quote - the home screen must not cost a Distance Matrix call
  // per row, and "what people paid" is a truer signal than a live estimate.
  distanceM: number;
  fromFarePaise: number;
  fromFareDisplay: string;
}

// A place the customer can travel to, from the maps provider rather than our
// own table: people go to towns we have never seen a booking for, and a search
// that only knows the cities we seeded finds nothing for most of India.
export interface PlaceSuggestion {
  id: string;
  name: string;
  context: string;
}
