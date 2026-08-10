import { Stack } from 'expo-router';

export default function TripDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pay" />
      <Stack.Screen name="qr" />
      <Stack.Screen name="paid" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="cancel" options={{ presentation: 'modal' }} />
      <Stack.Screen name="rate" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
