import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../stores/useAuthStore';

export default function BookingLayout() {
  const booting = useAuthStore((st) => st.booting);
  const user = useAuthStore((st) => st.user);
  if (booting) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="plan" />
      <Stack.Screen name="vehicles" />
      <Stack.Screen name="review" />
      <Stack.Screen name="confirmed" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
