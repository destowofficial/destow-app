import {
  Vehicle,
  PopularRoute,
  Trip,
  FareBreakdown,
  BookingDetails,
  UserProfile,
  ApiResponse,
  TripFilter,
  SearchParams,
  AuthUser,
  SignupData,
} from './types';
import { vehicles } from '../data/vehicles';
import { popularRoutes } from '../data/routes';
import { trips } from '../data/trips';
import { cityNames } from '../data/cities';
import { mockUsers, mockOtpStore, DEFAULT_OTP } from '../data/users';

const LATENCY_MIN = 600;
const LATENCY_MAX = 1200;
const ERROR_RATE = 0;

function simulateLatency(): Promise<void> {
  const delay = Math.random() * (LATENCY_MAX - LATENCY_MIN) + LATENCY_MIN;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function shouldError(): boolean {
  return Math.random() < ERROR_RATE;
}

function generateBookingId(): string {
  const now = new Date();
  const datePart = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
  return `DST${datePart}${seq}`;
}

export async function fetchPopularRoutes(): Promise<ApiResponse<PopularRoute[]>> {
  await simulateLatency();
  if (shouldError()) {
    return { data: [], error: 'Failed to load popular routes. Please try again.' };
  }
  return { data: popularRoutes, error: null };
}

export async function fetchCities(): Promise<ApiResponse<string[]>> {
  await simulateLatency();
  return { data: cityNames, error: null };
}

export async function searchVehicles(
  params: SearchParams
): Promise<ApiResponse<Vehicle[]>> {
  await simulateLatency();
  if (shouldError()) {
    return { data: [], error: 'Failed to search vehicles. Please try again.' };
  }
  return { data: vehicles, error: null };
}

export async function calculateFare(
  vehicleId: number,
  distance: number,
  passengers: number
): Promise<ApiResponse<FareBreakdown>> {
  await simulateLatency();
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    return { data: null as any, error: 'Vehicle not found.' };
  }

  const baseFare = vehicle.ratePerKm * distance;
  const gst = Math.round(baseFare * 0.09);
  const platformFee = 0;
  const totalFare = baseFare + gst + platformFee;

  return {
    data: {
      vehicleType: vehicle.type,
      distance,
      ratePerKm: vehicle.ratePerKm,
      baseFare,
      gst,
      platformFee,
      totalFare,
      date: 'July 5, 2026',
      time: '9:00 AM',
      passengers,
    },
    error: null,
  };
}

export async function createBooking(): Promise<ApiResponse<BookingDetails>> {
  await simulateLatency();
  if (shouldError()) {
    return { data: null as any, error: 'Booking failed. Please try again.' };
  }

  return {
    data: {
      bookingId: generateBookingId(),
      status: 'Confirmed',
      driverName: 'Rajesh Kumar',
      driverPhone: '+91 98765 43210',
      vehicleNumber: 'DL 1C AB 1234',
      vehicleType: 'AC Seater Bus',
      from: 'Delhi',
      to: 'Agra',
      date: 'July 5, 2026',
      time: '9:00 AM',
      pickupPoint: 'Kashmere Gate ISBT, Delhi',
      fare: 3047,
    },
    error: null,
  };
}

export async function fetchTrips(
  filter: TripFilter = 'all'
): Promise<ApiResponse<Trip[]>> {
  await simulateLatency();
  const filtered = filter === 'all' ? trips : trips.filter((t) => t.status === filter);
  return { data: filtered, error: null };
}

export async function fetchUserProfile(): Promise<ApiResponse<UserProfile>> {
  await simulateLatency();
  return {
    data: {
      name: 'Sarthak Bhatt',
      email: 'sarthak.bhatt@example.com',
      phone: '+91 98765 43210',
      totalTrips: 12,
      rating: 4.9,
    },
    error: null,
  };
}

export function getDistance(from: string, to: string): number {
  const routeDistances: Record<string, number> = {
    'Delhi-Agra': 233,
    'Mumbai-Pune': 148,
    'Bangalore-Mysore': 143,
    'Chennai-Pondicherry': 150,
  };
  const key = `${from}-${to}`;
  return routeDistances[key] || 200;
}

// ─── Auth Services ────────────────────────────────────────────

const users = [...mockUsers];

function generateUserId(): string {
  return `usr_${String(users.length + 1).padStart(3, '0')}`;
}

export async function sendOtp(
  phone: string
): Promise<ApiResponse<{ message: string; otp: string }>> {
  await simulateLatency();

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const existingOtp = mockOtpStore[cleanPhone];
  const otp = existingOtp || DEFAULT_OTP;

  return {
    data: { message: `OTP sent to +91 ${cleanPhone}`, otp },
    error: null,
  };
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<ApiResponse<AuthUser>> {
  await simulateLatency();

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const expectedOtp = mockOtpStore[cleanPhone] || DEFAULT_OTP;

  if (otp !== expectedOtp) {
    return { data: null as any, error: 'Invalid OTP. Please try again.' };
  }

  const user = users.find(
    (u) => u.phone.replace(/\D/g, '').slice(-10) === cleanPhone
  );

  if (!user) {
    return {
      data: null as any,
      error: 'Account not found. Please sign up first.',
    };
  }

  return { data: user, error: null };
}

export async function signupUser(
  data: SignupData
): Promise<ApiResponse<AuthUser>> {
  await simulateLatency();

  const cleanPhone = data.phone.replace(/\D/g, '').slice(-10);

  const existing = users.find(
    (u) => u.phone.replace(/\D/g, '').slice(-10) === cleanPhone
  );
  if (existing) {
    return {
      data: null as any,
      error: 'Phone number already registered. Please login.',
    };
  }

  const emailExists = users.find(
    (u) => u.email.toLowerCase() === data.email.toLowerCase()
  );
  if (emailExists) {
    return {
      data: null as any,
      error: 'Email already registered. Please login.',
    };
  }

  const newUser: AuthUser = {
    id: generateUserId(),
    name: data.name,
    email: data.email,
    phone: cleanPhone,
    dateOfBirth: data.dateOfBirth,
    referralCode: data.referralCode,
    totalTrips: 0,
    rating: 0,
    createdAt: new Date().toISOString().split('T')[0],
  };

  users.push(newUser);
  mockOtpStore[cleanPhone] = DEFAULT_OTP;

  return { data: newUser, error: null };
}

export async function fetchAuthUser(
  userId: string
): Promise<ApiResponse<AuthUser>> {
  await simulateLatency();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { data: null as any, error: 'User not found.' };
  }
  return { data: user, error: null };
}
