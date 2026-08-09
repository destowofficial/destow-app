const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Cleartext is a development convenience and nothing else.
//
// Every request carries a bearer token and a phone number, and on http they go
// out readable to anything on the network. __DEV__ is compiled out of a release
// build, so this throws at startup in a shipped app pointed at http - loudly, at
// the developer, rather than silently leaking in a customer's hand.
if (!__DEV__ && !apiUrl.startsWith('https://')) {
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
