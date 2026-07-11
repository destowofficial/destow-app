import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';
import { StatusBadge } from '../ui/StatusBadge';
import type { Trip } from '../../services/types';

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
}

export function TripCard({ trip, onPress }: TripCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.container}>
      <View style={styles.header}>
        <StatusBadge status={trip.status} />
        <Text style={styles.id}>#{trip.id}</Text>
      </View>

      <View style={styles.route}>
        <View style={styles.routeLeft}>
          <View style={[styles.dot, { backgroundColor: colors.primary[600] }]} />
          <Text style={styles.city}>{trip.from}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
        <View style={styles.routeRight}>
          <Text style={styles.city}>{trip.to}</Text>
          <View style={[styles.dot, { backgroundColor: colors.success[600] }]} />
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.neutral[500]} />
          <Text style={styles.detailText}>{trip.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color={colors.neutral[500]} />
          <Text style={styles.detailText}>{trip.time}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.vehicleType}>{trip.vehicleType}</Text>
          <Text style={styles.fare}>₹{trip.fare}</Text>
        </View>
        {trip.status === 'upcoming' && (
          <Text style={styles.actionLink}>View Details →</Text>
        )}
        {trip.status === 'completed' && (
          <Text style={[styles.actionLink, { color: colors.success[600] }]}>Book Again →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  id: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  routeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  city: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
  },
  details: {
    flexDirection: 'row',
    gap: spacing.base,
    marginBottom: spacing.base,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[600],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  vehicleType: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  fare: {
    fontSize: typography.sizes.lg,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.neutral[900],
  },
  actionLink: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.primary[600],
  },
});
