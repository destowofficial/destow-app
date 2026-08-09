export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
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
