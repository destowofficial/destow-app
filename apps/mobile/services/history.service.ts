import { apiGet } from './api';
import { Booking } from './cabs.service';

export interface TripHistoryResponse {
  bookings: Booking[];
  total: number;
  page: number;
  limit: number;
}

export async function getTripHistory(
  page = 1,
  limit = 10,
  status?: string,
): Promise<TripHistoryResponse> {
  let path = `/history?page=${page}&limit=${limit}`;
  if (status) path += `&status=${status}`;
  return apiGet<TripHistoryResponse>(path);
}
