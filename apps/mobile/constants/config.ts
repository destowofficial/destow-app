const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Cleartext is a development convenience and nothing else.
//
// Every request carries a bearer token and a phone number, and on http they go
// out readable to anything on the network. A release build pointed at http
// refuses to start - loudly, at the developer, rather than quietly leaking in a
// customer's hand.
//
// __DEV__ is a React Native global and does not exist under Bun, where the
// wireup check runs. Reading it directly threw there, which is how this was
// caught; treating "not React Native" as development keeps the guard about
// shipped builds, which is the only place it means anything.
const isDev = typeof __DEV__ === 'undefined' || __DEV__;
if (!isDev && !apiUrl.startsWith('https://')) {
  throw new Error(`EXPO_PUBLIC_API_URL must be https in a release build, got: ${apiUrl}`);
}

export const config = {
  apiUrl,
  // Gone: the app talks to the real API. The twelve mock functions it used to
  // call returned shapes that had already drifted from the server, which is the
  // problem sharing @destow/contracts now prevents.
  appVersion: '1.0.0',
  appName: 'DESTOW',
  supportEmail: 'support@destow.app',
  defaultPassengers: 1,
  maxPassengers: 8,
  gstRate: 0.09,
  platformFee: 0,
};
