import type {
  AvailableVehicle,
  CancellationPreview,
  City,
  CustomerBooking,
  Paginated,
  PopularRoute,
  RouteQuote,
  VehicleCategory,
} from '@destow/contracts';
import { api } from './http';
import { saveSession, clearSession, getRefreshToken } from './session';

// Every endpoint the customer app uses, typed from the same contracts package
// the server validates against - so a field that changes shape server-side fails
// the build here rather than at runtime in someone's hand.

// --- Auth --------------------------------------------------------------------

export interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export async function requestOtp(phone: string): Promise<{ channel: string; devCode?: string }> {
  return api.post('/auth/request-otp', { phone }, { anonymous: true });
}

export async function verifyOtp(input: {
  phone: string;
  code: string;
  name?: string;
  deviceName?: string;
}): Promise<AuthUser> {
  // The client is bound into the token's audience, which is what keeps a
  // customer session out of the partner and admin surfaces.
  const data = await api.post<TokenPair>(
    '/auth/verify-otp',
    { ...input, client: 'customer_app' },
    { anonymous: true },
  );
  await saveSession(data);
  return data.user;
}

/** Cold start: turn a stored refresh token back into a session, or nothing. */
export async function restoreSession(): Promise<AuthUser | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const data = await api.post<TokenPair>('/auth/refresh', { refreshToken }, { anonymous: true });
    await saveSession(data);
    return data.user ?? (await getMe());
  } catch {
    await clearSession();
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    // Local state clears whether or not the server heard us: a customer who
    // taps sign out must end up signed out of this device regardless.
    await clearSession();
  }
}

export async function signOutEverywhere(): Promise<void> {
  try {
    await api.post('/auth/logout-all');
  } finally {
    await clearSession();
  }
}

export interface SessionSummary {
  id: string;
  deviceName: string | null;
  platform: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  current: boolean;
}

export async function listSessions(): Promise<SessionSummary[]> {
  const data = await api.get<{ sessions: SessionSummary[] }>('/auth/sessions');
  return data.sessions;
}

// --- Profile -----------------------------------------------------------------

export async function getMe(): Promise<AuthUser> {
  const data = await api.get<{ user: AuthUser }>('/users/me');
  return data.user;
}

export async function updateMe(input: { name?: string; email?: string }): Promise<AuthUser> {
  const data = await api.patch<{ user: AuthUser }>('/users/me', input);
  return data.user;
}

// --- Catalogue and quotes ----------------------------------------------------

export async function listCities(): Promise<City[]> {
  const data = await api.get<{ cities: City[] }>('/cities');
  return data.cities;
}

export async function listPopularRoutes(): Promise<PopularRoute[]> {
  const data = await api.get<{ routes: PopularRoute[] }>('/routes/popular');
  return data.routes;
}

export async function quoteRoute(from: string, to: string): Promise<RouteQuote> {
  const data = await api.post<{ route: RouteQuote }>('/search', { from, to });
  return data.route;
}

export async function listAvailableVehicles(input: {
  from: string;
  to: string;
  category?: VehicleCategory;
}): Promise<{
  route: RouteQuote;
  vehicles: AvailableVehicle[];
  totalAvailable: number;
  truncated: boolean;
}> {
  return api.post('/vehicles/available', input);
}

// --- Bookings ----------------------------------------------------------------

export async function createBooking(input: {
  vehicleId: string;
  from: string;
  to: string;
  pickupDatetime: Date;
  returnDatetime: Date;
}): Promise<CustomerBooking> {
  const data = await api.post<{ booking: CustomerBooking }>('/bookings', {
    ...input,
    pickupDatetime: input.pickupDatetime.toISOString(),
    returnDatetime: input.returnDatetime.toISOString(),
  });
  return data.booking;
}

export async function listMyBookings(query: {
  status?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Paginated<CustomerBooking>> {
  const qs = new URLSearchParams();
  if (query.status) qs.set('status', query.status);
  if (query.page) qs.set('page', String(query.page));
  if (query.limit) qs.set('limit', String(query.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  return api.get(`/bookings${suffix}`);
}

export async function getBooking(id: string): Promise<CustomerBooking> {
  const data = await api.get<{ booking: CustomerBooking }>(`/bookings/${id}`);
  return data.booking;
}

export async function previewCancellation(id: string): Promise<CancellationPreview> {
  const data = await api.get<{ cancellation: CancellationPreview }>(`/bookings/${id}/cancellation`);
  return data.cancellation;
}

export async function cancelBooking(id: string): Promise<CustomerBooking> {
  const data = await api.post<{ booking: CustomerBooking }>(`/bookings/${id}/cancel`);
  return data.booking;
}

// --- Paying ------------------------------------------------------------------

export interface QrPayment {
  bookingId: string;
  qrId: string;
  payload: string;
  amountPaise: number;
  amountDisplay: string;
  expiresAt: string;
  alreadyPaid: boolean;
}

/** Raise a QR for what the trip actually cost. The amount is never sent. */
export async function startQrPayment(bookingId: string): Promise<QrPayment> {
  const data = await api.post<{ payment: QrPayment }>(`/bookings/${bookingId}/pay/qr`);
  return data.payment;
}

/** Polled by the QR screen while the customer is paying. Deliberately tiny. */
export async function paymentStatus(bookingId: string): Promise<{
  bookingId: string;
  paymentStatus: string;
  paidAt: string | null;
}> {
  const data = await api.get<{ payment: { bookingId: string; paymentStatus: string; paidAt: string | null } }>(
    `/bookings/${bookingId}/pay/status`,
  );
  return data.payment;
}

// --- Ratings -----------------------------------------------------------------

export async function rateBooking(
  bookingId: string,
  input: { rating: number; comment?: string },
): Promise<void> {
  await api.post(`/bookings/${bookingId}/rating`, input);
}

export async function getRating(
  bookingId: string,
): Promise<{ rating: number; comment: string | null } | null> {
  const data = await api.get<{ rating: { rating: number; comment: string | null } | null }>(
    `/bookings/${bookingId}/rating`,
  );
  return data.rating;
}
