import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppColors, Spacing, Radii, Shadows, Typography } from '../../constants/design-tokens';
import { useEffect, useState } from 'react';
import { getTripHistory } from '../../services/history.service';
import { Booking } from '../../services/cabs.service';

function TripCard({ booking }: { booking: Booking }) {
  const statusColor: Record<string, string> = {
    confirmed: '#10B981',
    pending: '#F59E0B',
    cancelled: AppColors.error,
    completed: AppColors.brand,
  };
  const color = statusColor[booking.status] ?? AppColors.textMuted;
  const date = new Date(booking.pickupDatetime).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.routeRow}>
            <Text style={styles.city}>{booking.fromLocation}</Text>
            <Feather name="arrow-right" size={16} color={AppColors.textMuted} style={{ marginHorizontal: 6 }} />
            <Text style={styles.city}>{booking.toLocation}</Text>
          </View>
          <Text style={styles.date}>{date}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: color }]}>
          <Text style={[styles.statusText, { color }]}>{booking.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Feather name="map-pin" size={13} color={AppColors.textMuted} />
          <Text style={styles.footerText}>{parseFloat(booking.distanceKm).toFixed(0)} km</Text>
        </View>
        <View style={styles.footerItem}>
          <Feather name="credit-card" size={13} color={AppColors.textMuted} />
          <Text style={styles.footerText}>{booking.paymentMethod.toUpperCase()}</Text>
        </View>
        <Text style={styles.fare}>₹{Math.round(parseFloat(booking.totalFare))}</Text>
      </View>
    </View>
  );
}

export default function TripsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTripHistory(1, 20);
        setBookings(data.bookings);
      } catch (e: any) {
        setError(e?.message ?? 'Could not load trips.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.headerTitle}>Your Trips</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.brand} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={48} color={AppColors.textMuted} />
          <Text style={styles.subtitle}>{error}</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.iconContainer}>
            <Feather name="book-open" size={48} color={AppColors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.subtitle}>Your upcoming and past trips will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TripCard booking={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  headerTitle: {
    ...Typography.screenTitle,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    fontSize: 28,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: AppColors.cardBgLight,
    borderRadius: 50,
  },
  emptyTitle: {
    ...Typography.screenTitle,
    marginBottom: Spacing.sm,
    fontSize: 22,
  },
  subtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    gap: Spacing.lg,
  },
  card: {
    backgroundColor: AppColors.background,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  city: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.brand,
  },
  date: {
    fontSize: 13,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: Radii.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  fare: {
    marginLeft: 'auto',
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.brand,
  },
});
