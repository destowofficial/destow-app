import { apiGet, apiPost } from './api';

export interface HomeUserInfo {
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  totalTrips: number;
}

export interface RouteSearchResult {
  from: string;
  to: string;
  date: string;
  time: string;
  distanceKm: number;
  estimatedDurationHrs: number;
  searchId: string;
}

export async function getUserHomeInfo(): Promise<HomeUserInfo> {
  return apiGet<HomeUserInfo>('/home/user-info');
}

export async function searchRoute(
  from: string,
  to: string,
  date: string,
  time: string,
): Promise<RouteSearchResult> {
  return apiPost<RouteSearchResult>('/home/search', { from, to, date, time });
}
