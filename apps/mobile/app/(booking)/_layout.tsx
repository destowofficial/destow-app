import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="search" />
      <Stack.Screen name="vehicles" />
      <Stack.Screen name="fare" />
      <Stack.Screen name="confirmation" />
    </Stack>
  );
}
