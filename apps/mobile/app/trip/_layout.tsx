import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../stores/useAuthStore';

export default function TripLayout() {
  const booting = useAuthStore((st) => st.booting);
  const user = useAuthStore((st) => st.user);
  if (booting) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  // The screens under [id] are declared by expo-router from the file tree.
  // Naming them here as "[id]/pay" was wrong - a nested segment needs its own
  // layout, which app/trip/[id]/_layout.tsx now provides.
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
