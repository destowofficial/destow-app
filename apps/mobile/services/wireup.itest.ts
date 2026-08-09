import { test, expect, beforeAll, mock } from 'bun:test';

// Does the app's service layer actually talk to the API?
//
// The screens cannot be rendered headlessly, but everything underneath them can
// be: this drives services/destow.ts against a real server, so a path, an
// envelope shape or a field name that has drifted fails here rather than in
// somebody's hand. Requires the API running - `bun run test:wireup`.

// SecureStore is native, so the Keychain is stubbed with a map. Nothing else is
// mocked: the HTTP client, the refresh rotation and the parsing are the real
// ones the app ships.
const keychain = new Map<string, string>();
mock.module('expo-secure-store', () => ({
  getItemAsync: async (k: string) => keychain.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void keychain.set(k, v),
  deleteItemAsync: async (k: string) => void keychain.delete(k),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
}));

const api = await import('./destow');
const { ApiError } = await import('./http');
const session = await import('./session');

// A number nobody else in the suite uses, so OTP rate limits stay out of the way.
const PHONE = `9${String(Date.now()).slice(-9)}`.slice(0, 10);

beforeAll(async () => {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/../health`.replace('/api/v1/..', ''));
  if (!res.ok) throw new Error('API is not running');
});

let bookingId = '';

test('a phone number gets an OTP, and the code signs in', async () => {
  const sent = await api.requestOtp(PHONE);
  expect(sent.devCode).toBeTruthy();

  const user = await api.verifyOtp({ phone: PHONE, code: sent.devCode!, name: 'Ananya Rao' });
  expect(user.phone).toBe(`+91${PHONE}`);
  expect(user.role).toBe('customer');
  // The access token is in memory and the refresh token in the "Keychain".
  expect(session.getAccessToken()).toBeTruthy();
  expect(await session.getRefreshToken()).toBeTruthy();
});

test('the profile round-trips', async () => {
  const me = await api.getMe();
  expect(me.name).toBe('Ananya Rao');
  const updated = await api.updateMe({ name: 'Ananya R' });
  expect(updated.name).toBe('Ananya R');
});

test('the home screen data loads', async () => {
  const cities = await api.listCities();
  expect(cities.length).toBeGreaterThan(0);
  expect(cities[0].name).toBeTruthy();
  // Popular routes are observed, so an empty list on a fresh database is
  // correct rather than a failure.
  expect(Array.isArray(await api.listPopularRoutes())).toBe(true);
});

test('a quote prices the round trip', async () => {
  const quote = await api.quoteRoute('Delhi', 'Manali');
  expect(quote.distanceM).toBeGreaterThan(0);

  const listing = await api.listAvailableVehicles({ from: 'Delhi', to: 'Manali' });
  expect(listing.vehicles.length).toBeGreaterThan(0);
  // Both legs: the listing prices the round trip, not the one-way route.
  const cheapest = listing.vehicles[0];
  expect(cheapest.totalFarePaise).toBe(
    Math.round((cheapest.pricePerKmPaise * listing.route.distanceM * 2) / 1000),
  );
  expect(cheapest.totalFareDisplay).toMatch(/^₹/);
});

test('a booking is created and comes back in the list', async () => {
  const listing = await api.listAvailableVehicles({ from: 'Delhi', to: 'Manali' });
  // A window unique to this run. The database refuses to double-book a vehicle
  // across overlapping dates, so a fixed pickup would make the second run of
  // this file fail against the first run's booking - the constraint working,
  // not a bug.
  const offsetHours = 30 * 24 + (Date.now() % 4000);
  const pickup = new Date(Date.now() + offsetHours * 3600 * 1000);
  const back = new Date(pickup.getTime() + 3 * 24 * 3600 * 1000);

  const booking = await api.createBooking({
    vehicleId: listing.vehicles[0].vehicleId,
    from: 'Delhi',
    to: 'Manali',
    pickupDatetime: pickup,
    returnDatetime: back,
  });
  bookingId = booking.id;

  expect(booking.status).toBe('pending');
  expect(booking.paymentStatus).toBe('pending');
  // Nothing is chosen or charged at booking time.
  expect(booking.paymentMethod).toBeNull();
  expect(booking.totalFarePaise).toBeGreaterThan(0);

  const page = await api.listMyBookings({ limit: 10 });
  expect(page.items.some((b) => b.id === bookingId)).toBe(true);
  expect(page.total).toBeGreaterThan(0);
});

test('the cancellation preview says what it would cost', async () => {
  const preview = await api.previewCancellation(bookingId);
  expect(preview.cancellable).toBe(true);
  // Booked well ahead, so it is inside the free window.
  expect(preview.isFree).toBe(true);
  expect(preview.cancellationFeePaise).toBe(0);
  expect(preview.freeUntil).toBeTruthy();
});

test('a QR cannot be raised before the trip has run', async () => {
  let caught: unknown;
  try {
    await api.startQrPayment(bookingId);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(ApiError);
  expect((caught as InstanceType<typeof ApiError>).status).toBe(409);
});

// The thing most likely to break silently: an access token expires, the client
// refreshes with the rotating token and retries, and the screen never notices.
test('an expired access token is refreshed and the request retried', async () => {
  session.setAccessToken('not-a-real-token');
  const me = await api.getMe();
  expect(me.phone).toBe(`+91${PHONE}`);
});

test('signing out clears the keychain', async () => {
  await api.signOut();
  expect(session.getAccessToken()).toBeNull();
  expect(await session.getRefreshToken()).toBeNull();
});
