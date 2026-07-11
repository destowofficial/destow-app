import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientHeader } from '../../components/ui/GradientHeader';
import { FilterTabs } from '../../components/ui/FilterTabs';
import { TripCard } from '../../components/cards/TripCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { fetchTrips } from '../../services/api';
import type { Trip, TripFilter } from '../../services/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function MyTrips() {
  const router = useRouter();
  const [filter, setFilter] = useState<TripFilter>('all');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, [filter]);

  const loadTrips = async () => {
    setLoading(true);
    const { data } = await fetchTrips(filter);
    setTrips(data);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GradientHeader
        title="My Trips"
        showBack
        onBack={() => router.back()}
      />
      <View style={styles.tabsContainer}>
        <FilterTabs
          tabs={['All', 'Upcoming', 'Completed', 'Cancelled']}
          activeTab={filter.charAt(0).toUpperCase() + filter.slice(1)}
          onTabChange={(tab) => setFilter(tab.toLowerCase() as TripFilter)}
          variant="header"
        />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {loading ? (
            <LoadingSkeleton count={3} variant="listItem" />
          ) : trips.length === 0 ? (
            <EmptyState
              title="No trips found"
              description={`You don't have any ${filter !== 'all' ? filter : ''} trips yet`}
              actionLabel="Book a Trip"
              onAction={() => router.push('/(tabs)')}
              iconName="ticket-outline"
            />
          ) : (
            trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))
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
  tabsContainer: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  list: {
    padding: spacing.base,
    gap: spacing.base,
  },
});
