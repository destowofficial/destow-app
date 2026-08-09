import React from 'react';
import { View, StyleSheet, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { color, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';

// Three destinations, which is the whole app: find a trip, look at your trips,
// and everything else. Auth routing lives in the root layout rather than here,
// so a redirect never races the tab navigator mounting.
export default function TabsLayout() {
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
            <Icon name={focused ? 'home' : 'home-outline'} tint={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color: c, focused }) => (
            <Icon name={focused ? 'list' : 'list-outline'} tint={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color: c, focused }) => (
            <Icon name={focused ? 'person' : 'person-outline'} tint={c} />
          ),
        }}
      />
    </Tabs>
  );
}

function Icon({ name, tint }: { name: keyof typeof Ionicons.glyphMap; tint: ColorValue }) {
  return (
    <View style={styles.icon}>
      <Ionicons name={name} size={f(22)} color={tint} />
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
