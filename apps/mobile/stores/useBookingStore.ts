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
  /**
   * Places to call at on the way out, in order. A round trip to Manali that
   * takes in Shimla is one hire, not two, so these belong to the journey rather
   * than being separate bookings.
   */
  stops: string[];
  /**
   * Departure only. Trips are round trips, but the customer never states a
   * return - it is estimated from the route when the booking is created, so
   * there is nothing here to hold.
   */
  pickup: Date | null;
  vehicle: AvailableVehicle | null;
  route: RouteQuote | null;
}

interface BookingState extends Draft {
  setRoute: (r: { from: string; to: string }) => void;
  setStop: (index: number, place: string) => void;
  addStop: (place: string) => void;
  removeStop: (index: number) => void;
  setDates: (d: { pickup?: Date }) => void;
  setVehicle: (v: AvailableVehicle, route: RouteQuote) => void;
  reset: () => void;
}

const empty: Draft = {
  from: '',
  to: '',
  stops: [],
  pickup: null,
  vehicle: null,
  route: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...empty,

  setRoute: ({ from, to }) =>
    // Changing either end invalidates the vehicle: it was priced for the old
    // route, and showing that fare against a new one would be a lie.
    set({ from, to, vehicle: null, route: null }),

  setDates: ({ pickup }) => set((st) => ({ pickup: pickup ?? st.pickup })),

  // Every change to the itinerary invalidates the vehicle for the same reason
  // changing either end does: it was priced for a different journey.
  setStop: (index, place) =>
    set((st) => ({
      stops: st.stops.map((p, i) => (i === index ? place : p)),
      vehicle: null,
      route: null,
    })),

  addStop: (place) =>
    set((st) => ({ stops: [...st.stops, place], vehicle: null, route: null })),

  removeStop: (index) =>
    set((st) => ({ stops: st.stops.filter((_, i) => i !== index), vehicle: null, route: null })),

  setVehicle: (vehicle, route) => set({ vehicle, route }),

  reset: () => set(empty),
}));
