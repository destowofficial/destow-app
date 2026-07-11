import { create } from 'zustand';
import { FareBreakdown, Vehicle } from '../services/types';

interface BookingState {
  fromCity: string;
  toCity: string;
  travelDate: string;
  passengers: number;
  selectedVehicle: Vehicle | null;
  distance: number;
  fareBreakdown: FareBreakdown | null;
  isSearching: boolean;

  setFromCity: (city: string) => void;
  setToCity: (city: string) => void;
  setTravelDate: (date: string) => void;
  setPassengers: (count: number) => void;
  selectVehicle: (vehicle: Vehicle) => void;
  setDistance: (distance: number) => void;
  setFareBreakdown: (fare: FareBreakdown) => void;
  setIsSearching: (loading: boolean) => void;
  swapCities: () => void;
  resetBooking: () => void;
}

const initialState = {
  fromCity: '',
  toCity: '',
  travelDate: '',
  passengers: 1,
  selectedVehicle: null,
  distance: 0,
  fareBreakdown: null,
  isSearching: false,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  setFromCity: (city) => set({ fromCity: city }),
  setToCity: (city) => set({ toCity: city }),
  setTravelDate: (date) => set({ travelDate: date }),
  setPassengers: (count) => set({ passengers: count }),
  selectVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  setDistance: (distance) => set({ distance }),
  setFareBreakdown: (fare) => set({ fareBreakdown: fare }),
  setIsSearching: (loading) => set({ isSearching: loading }),
  swapCities: () =>
    set((state) => ({
      fromCity: state.toCity,
      toCity: state.fromCity,
    })),
  resetBooking: () => set(initialState),
}));
