import { Stack } from 'expo-router';

export default function TripLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/pay" />
      <Stack.Screen name="[id]/qr" />
      <Stack.Screen name="[id]/paid" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="[id]/cancel" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[id]/rate" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
