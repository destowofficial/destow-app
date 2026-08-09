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
}
