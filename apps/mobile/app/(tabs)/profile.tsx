import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientHeader } from '../../components/ui/GradientHeader';
import { ProfileMenuItem } from '../../components/cards/ProfileMenuItem';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { fetchUserProfile } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import type { UserProfile } from '../../services/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';

const menuItems = [
  { id: 'personal', icon: 'person-outline', label: 'Personal Information', description: 'Update your profile details', color: colors.primary[600] },
  { id: 'payment', icon: 'card-outline', label: 'Payment Methods', description: 'Manage your cards & UPI', color: colors.success[600], comingSoon: true },
  { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', description: 'Manage your alerts', color: colors.warning[500] },
  { id: 'referral', icon: 'gift-outline', label: 'Refer & Earn', description: 'Invite friends and get rewards', color: '#9333ea', comingSoon: true },
  { id: 'help', icon: 'help-circle-outline', label: 'Help & Support', description: 'Get help with your bookings', color: colors.primary[600] },
  { id: 'terms', icon: 'document-text-outline', label: 'Terms & Conditions', description: 'Read our policies', color: colors.neutral[600] },
  { id: 'privacy', icon: 'shield-checkmark-outline', label: 'Privacy Policy', description: 'How we protect your data', color: colors.neutral[600] },
];

export default function Profile() {
  const router = useRouter();
  const { user: authUser, logout } = useAuthStore();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    if (authUser) {
      setUser({
        name: authUser.name,
        email: authUser.email,
        phone: `+91 ${authUser.phone}`,
        totalTrips: authUser.totalTrips,
        rating: authUser.rating,
      });
    } else {
      const { data } = await fetchUserProfile();
      setUser(data);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleMenuPress = (item: typeof menuItems[0]) => {
    if ('comingSoon' in item && item.comingSoon) {
      Alert.alert('Coming Soon', 'This feature will be available in a future update.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GradientHeader
        title="Profile"
        showBack
        onBack={() => router.back()}
      />

      {/* User Card */}
      <View style={styles.userCardContainer}>
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.primary[600]} />
          </View>
          {loading ? (
            <LoadingSkeleton count={1} variant="listItem" />
          ) : user && (
            <>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#facc15" />
                  <Text style={styles.ratingText}>{user.rating}</Text>
                  <Text style={styles.tripCount}>{user.totalTrips} trips</Text>
                </View>
              </View>
              <View style={styles.contactInfo}>
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.contactText}>{user.email}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.contactText}>{user.phone}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <ProfileMenuItem
              key={item.id}
              iconName={item.icon}
              label={item.label}
              description={item.description}
              onPress={() => handleMenuPress(item)}
              color={item.color}
              isLast={index === menuItems.length - 1}
            />
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary[50] }]}>
              <Ionicons name="map-outline" size={24} color={colors.primary[600]} />
            </View>
            <Text style={styles.statValue}>{user?.totalTrips ?? 0}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.success[50] }]}>
              <Ionicons name="star-outline" size={24} color={colors.success[600]} />
            </View>
            <Text style={styles.statValue}>{user?.rating ?? 0}</Text>
            <Text style={styles.statLabel}>Your Rating</Text>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <ProfileMenuItem
            iconName="log-out-outline"
            label="Logout"
            description=""
            onPress={handleLogout}
            color={colors.danger[600]}
          />
        </View>

        <Text style={styles.version}>DESTOW v1.0.0</Text>
        <Text style={styles.copyright}>© 2026 DESTOW Pvt Ltd. All rights reserved.</Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primary[600],
  },
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  userCardContainer: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl + spacing.base,
  },
  userCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  userInfo: {
    marginBottom: spacing.md,
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.white,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: 'rgba(255,255,255,0.9)',
  },
  tripCount: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: spacing.sm,
  },
  contactInfo: {
    gap: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: 'rgba(255,255,255,0.9)',
  },
  menuContainer: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    marginTop: -spacing.base,
    borderRadius: radii.xl,
    overflow: 'hidden',
    paddingTop: spacing.sm,
    ...shadows.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statValue: {
    fontSize: 24,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.neutral[900],
    marginBottom: 2,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  logoutContainer: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#fecaca',
    overflow: 'hidden',
  },
  version: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[400],
    marginTop: spacing.xl,
  },
  copyright: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[400],
    marginTop: spacing.xs,
  },
});
