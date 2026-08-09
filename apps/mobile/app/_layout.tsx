import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { useAuthStore } from '../stores/useAuthStore';

SplashScreen.preventAutoHideAsync();

// The navigator, and nothing else.
//
// Where to send somebody is decided in app/index.tsx with <Redirect>, not with
// router.replace() from an effect here. Navigating imperatively from the root
// layout runs before the navigator has mounted, and expo-router throws on that -
// which is exactly how this crashed on first open.
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const booting = useAuthStore((st) => st.booting);
  const boot = useAuthStore((st) => st.boot);

  // Exchange the stored refresh token for a session before anything routes.
  useEffect(() => {
    void boot();
  }, [boot]);

  // Hold the native splash until the fonts and the session are both settled, so
  // nobody sees the login screen for a frame before being sent to Home.
  useEffect(() => {
    if (fontsLoaded && !booting) void SplashScreen.hideAsync();
  }, [fontsLoaded, booting]);

  // Every screen sits on SafeAreaView and the footers read useSafeAreaInsets,
  // and that hook throws outright without a provider above it - which is the
  // other half of why this crashed rather than merely mis-rendering.
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(booking)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="trip" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  );
}
