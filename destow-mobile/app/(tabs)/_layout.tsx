import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { AppColors, Spacing, Shadows } from '../../constants/design-tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: AppColors.background,
          borderTopWidth: 0,
          height: 65,
          paddingBottom: Spacing.sm,
          paddingTop: Spacing.xs,
          ...Shadows.subtle,
        },
        tabBarActiveTintColor: AppColors.brand,
        tabBarInactiveTintColor: AppColors.tabInactive,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color }) => (
            <Feather name="book-open" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Support',
          tabBarIcon: ({ color }) => (
            <Feather name="headphones" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
