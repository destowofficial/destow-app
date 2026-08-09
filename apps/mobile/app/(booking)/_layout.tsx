import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="plan" />
      <Stack.Screen name="vehicles" />
      <Stack.Screen name="review" />
      <Stack.Screen name="confirmed" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
