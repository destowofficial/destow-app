import React from 'react';
import { View, StyleSheet, type ColorValue } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Icon, type IconName } from '../../components/ui/Icon';
import { color, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { useAuthStore } from '../../stores/useAuthStore';

// Three destinations, which is the whole app: find a trip, look at your trips,
// and everything else. Auth routing lives in the root layout rather than here,
// so a redirect never races the tab navigator mounting.
export default function TabsLayout() {
  const booting = useAuthStore((st) => st.booting);
  const user = useAuthStore((st) => st.user);

  // Declarative rather than an effect: signing out has to leave immediately,
  // and a <Redirect> inside the navigator cannot fire before it is mounted.
  if (booting) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.blue,
        tabBarInactiveTintColor: color.dim,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: { paddingTop: s(6) },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color: c, focused }) => (
            <TabIcon name="home" tint={c} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color: c, focused }) => (
            <TabIcon name="trips" tint={c} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color: c, focused }) => (
            <TabIcon name="user" tint={c} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

// A heavier stroke when selected, which is how the set signals state - it has
// no separate filled variants the way Ionicons did.
function TabIcon({ name, tint, focused }: { name: IconName; tint: ColorValue; focused: boolean }) {
  return (
    <View style={styles.icon}>
      <Icon name={name} size={22} color={String(tint)} strokeWidth={focused ? 2.4 : 1.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.card,
    borderTopColor: color.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: s(74),
    paddingBottom: s(10),
  },
  label: { fontSize: f(10.5), fontWeight: weight.semi, marginTop: s(2) },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
