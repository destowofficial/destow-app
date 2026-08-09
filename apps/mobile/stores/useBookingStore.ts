import { create } from 'zustand';
import type { AvailableVehicle, RouteQuote } from '@destow/contracts';

// What the customer has chosen so far, held across the booking screens.
//
// Nothing here reaches money. The fare shown on the review screen comes from the
// server's own listing, and the booking is created from a vehicle id and two
// dates - the server routes the distance and computes the price itself, so a
// value tampered with in this store changes what is displayed and nothing else.

export interface Draft {
  from: string;
  to: string;
  /** Departure. Every Destow trip is a round trip, so a return is required. */
  pickup: Date | null;
  returnAt: Date | null;
  vehicle: AvailableVehicle | null;
  route: RouteQuote | null;
}

interface BookingState extends Draft {
  setRoute: (r: { from: string; to: string }) => void;
  setDates: (d: { pickup?: Date; returnAt?: Date }) => void;
  setVehicle: (v: AvailableVehicle, route: RouteQuote) => void;
  reset: () => void;
}

const empty: Draft = {
  from: '',
  to: '',
  pickup: null,
  returnAt: null,
  vehicle: null,
  route: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...empty,

  setRoute: ({ from, to }) =>
    // Changing either end invalidates the vehicle: it was priced for the old
    // route, and showing that fare against a new one would be a lie.
    set({ from, to, vehicle: null, route: null }),

  setDates: ({ pickup, returnAt }) =>
    set((st) => ({
      pickup: pickup ?? st.pickup,
      returnAt: returnAt ?? st.returnAt,
    })),

  setVehicle: (vehicle, route) => set({ vehicle, route }),

  reset: () => set(empty),
}));
