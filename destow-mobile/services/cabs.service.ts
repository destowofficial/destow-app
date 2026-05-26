import { apiPost } from './api';

export interface CabType {
  name: string;
  seats: number;
  bags: number;
  imageKey: string | null;
}

export interface Cab {
  id: string;
  agencyName: string;
  driverName: string | null;
  driverAvailable: boolean;
  cabType: CabType;
  pricePerKm: number;
  totalFare: number;
  distanceKm: number;
  from: string;
  to: string;
}

export interface Booking {
  id: string;
  userId: string;
  cabId: string;
  fromLocation: string;
  toLocation: string;
  pickupDatetime: string;
  distanceKm: string;
  totalFare: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
}

export interface BookCabPayload {
  cabId: string;
  from: string;
  to: string;
  pickupDatetime: string;
  distanceKm: number;
  totalFare: number;
  paymentMethod: string;
}

export async function getAvailableCabs(
  from: string,
  to: string,
  date: string,
  time: string,
  distanceKm: number,
): Promise<Cab[]> {
  const result = await apiPost<{ cabs: Cab[] }>('/cabs/available', {
    from,
    to,
    date,
    time,
    distanceKm,
  });
  return result.cabs;
}

export async function bookCab(payload: BookCabPayload): Promise<Booking> {
  const result = await apiPost<{ booking: Booking }>('/cabs/book', payload);
  return result.booking;
}

export async function processPayment(
  bookingId: string,
  method: string,
  transactionRef?: string,
): Promise<Booking> {
  const result = await apiPost<{ booking: Booking }>('/cabs/payment', {
    bookingId,
    method,
    transactionRef,
  });
  return result.booking;
}
