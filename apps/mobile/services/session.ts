import * as SecureStore from 'expo-secure-store';

// Where the tokens live.
//
// The refresh token is the long-lived credential - it mints access tokens, so
// anything holding it holds the account - and it goes in the Keychain on iOS and
// the Keystore on Android rather than anywhere a backup or another app can read.
// The access token is short-lived and kept in memory only: writing it to disk
// buys nothing, because it is refreshed on every cold start anyway.

const REFRESH_KEY = 'destow.refresh';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    // A locked or unavailable keychain is a signed-out state, not a crash.
    return null;
  }
}

export async function saveSession(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  accessToken = tokens.accessToken;
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    // Nothing to delete is the state we wanted anyway.
  }
}
