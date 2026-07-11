export interface Vehicle {
  id: number;
  type: string;
  category: 'Bus' | 'Car';
  capacity: string;
  imageUrl: string;
  ratePerKm: number;
  amenities: string[];
  rating: number;
  reviews: number;
}

export interface PopularRoute {
  from: string;
  to: string;
  distance: string;
  fare: string;
  duration: string;
  imageUrl: string;
}

export interface Trip {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  vehicleType: string;
  fare: number;
}

export interface FareBreakdown {
  vehicleType: string;
  distance: number;
  ratePerKm: number;
  baseFare: number;
  gst: number;
  platformFee: number;
  totalFare: number;
  date: string;
  time: string;
  passengers: number;
}

export interface BookingDetails {
  bookingId: string;
  status: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  vehicleType: string;
  from: string;
  to: string;
  date: string;
  time: string;
  pickupPoint: string;
  fare: number;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  totalTrips: number;
  rating: number;
}

export interface City {
  name: string;
  state: string;
}

export type TripFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export interface SearchParams {
  from: string;
  to: string;
  date: string;
  passengers: number;
}

export interface OnboardingSlide {
  icon: string;
  title: string;
  description: string;
  color: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  referralCode?: string;
  totalTrips: number;
  rating: number;
  createdAt: string;
}

export interface SignupData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  referralCode?: string;
}

export interface OtpVerification {
  phone: string;
  otp: string;
}
