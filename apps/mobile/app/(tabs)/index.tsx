import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';
import { SearchCard } from '../../components/cards/SearchCard';
import { PopularRouteCard } from '../../components/cards/PopularRouteCard';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { fetchPopularRoutes } from '../../services/api';
import type { PopularRoute } from '../../services/types';
import { useBookingStore } from '../../stores/useBookingStore';

export default function Home() {
  const router = useRouter();
  const [popularRoutes, setPopularRoutes] = useState<PopularRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const { fromCity, toCity, setFromCity, setToCity } = useBookingStore();

  useEffect(() => {
    loadPopularRoutes();
  }, []);

  const loadPopularRoutes = async () => {
    setLoading(true);
    const { data } = await fetchPopularRoutes();
    setPopularRoutes(data);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={colors.primary.gradient as any}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.headerTitle}>DESTOW</Text>
                <Text style={styles.headerSubtitle}>Your Journey Awaits</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.profileButton}
              activeOpacity={0.7}
              accessibilityLabel="Go to profile"
            >
              <Ionicons name="person" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchCardContainer}>
            <SearchCard
              from={fromCity || undefined}
              to={toCity || undefined}
              onPress={() => router.push('/(booking)/search')}
            />
          </View>
        </LinearGradient>

        {/* Choose Your Ride */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Ride</Text>
          <View style={styles.serviceGrid}>
            <TouchableOpacity
              onPress={() => router.push('/(booking)/search')}
              activeOpacity={0.8}
              style={styles.serviceCard}
            >
              <View style={[styles.serviceIcon, { backgroundColor: colors.primary[50] }]}>
                <Ionicons name="bus" size={28} color={colors.primary[600]} />
              </View>
              <Text style={styles.serviceName}>Bus</Text>
              <Text style={styles.serviceDesc}>Comfortable travel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(booking)/search')}
              activeOpacity={0.8}
              style={styles.serviceCard}
            >
              <View style={[styles.serviceIcon, { backgroundColor: colors.success[50] }]}>
                <Ionicons name="car" size={28} color={colors.success[600]} />
              </View>
              <Text style={styles.serviceName}>Car</Text>
              <Text style={styles.serviceDesc}>Private & flexible</Text>
            </TouchableOpacity>
          </View>

          {/* Value Proposition */}
          <LinearGradient
            colors={[colors.success[500], colors.primary[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.valueBanner}
          >
            <View style={styles.valueIcon}>
              <Ionicons name="star" size={24} color={colors.white} />
            </View>
            <View>
              <Text style={styles.valueTitle}>Transparent ₹/km Pricing</Text>
              <Text style={styles.valueDesc}>No hidden charges, ever!</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Popular Routes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Routes</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <LoadingSkeleton count={3} variant="listItem" />
          ) : (
            <View style={styles.routesList}>
              {popularRoutes.map((route, index) => (
                <PopularRouteCard
                  key={index}
                  route={route}
                  onPress={() => {
                    setFromCity(route.from);
                    setToCity(route.to);
                    router.push('/(booking)/search');
                  }}
                />
              ))}
            </View>
          )}
        </View>

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
  header: {
    paddingTop: spacing.base,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCardContainer: {
    marginTop: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
    marginBottom: spacing.base,
  },
  seeAll: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.primary[600],
  },
  serviceGrid: {
    flexDirection: 'row',
    gap: spacing.base,
    marginBottom: spacing.base,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...shadows.sm,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  serviceName: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  valueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radii.xl,
  },
  valueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueTitle: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.white,
  },
  valueDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: 'rgba(255,255,255,0.9)',
  },
  routesList: {
    gap: spacing.base,
  },
});
