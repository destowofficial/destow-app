import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { color } from '../theme/tokens';
import { useAuthStore } from '../stores/useAuthStore';

// The entry point, and the only place that decides where somebody lands.
//
// Declarative on purpose. <Redirect> is evaluated as part of rendering the
// navigator, so it cannot run before the navigator exists - which is what breaks
// when you call router.replace() from the root layout's effect.
export default function Index() {
  const booting = useAuthStore((st) => st.booting);
  const user = useAuthStore((st) => st.user);

  // The native splash is still up while this is true, so the blank ground here
  // is never actually seen - it just has to match if the splash hides early.
  if (booting) return <View style={styles.hold} />;

  if (!user) return <Redirect href="/(auth)/login" />;
  // A driver has to ask for someone at pickup, so a name is the one thing
  // collected before a trip can be booked.
  if (!user.name) return <Redirect href="/(auth)/signup" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  hold: { flex: 1, backgroundColor: color.white },
});
