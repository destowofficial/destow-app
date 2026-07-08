import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientHeader } from '../../components/ui/GradientHeader';
import { GradientButton } from '../../components/ui/GradientButton';
import { FareRow } from '../../components/cards/FareRow';
import { useBookingStore } from '../../stores/useBookingStore';
import { calculateFare } from '../../services/api';
import type { FareBreakdown as FareBreakdownType } from '../../services/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';

export default function FareBreakdown() {
  const router = useRouter();
  const { selectedVehicle, distance, passengers } = useBookingStore();
  const [fare, setFare] = useState<FareBreakdownType | null>(null);
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  useEffect(() => {
    loadFare();
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadFare = async () => {
    if (selectedVehicle) {
      const { data } = await calculateFare(selectedVehicle.id, distance, passengers);
      setFare(data);
    }
  };

  if (!fare) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GradientHeader
        title="Fare Breakdown"
        subtitle="Review your booking"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Trip Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Trip Details</Text>
            <Text style={styles.badge}>{fare.vehicleType}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.primary[50] }]}>
              <Ionicons name="location" size={20} color={colors.primary[600]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Route</Text>
              <Text style={styles.detailValue}>Delhi → Agra</Text>
              <Text style={styles.detailSub}>{fare.distance} kilometers</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.success[50] }]}>
              <Ionicons name="calendar" size={20} color={colors.success[600]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>{fare.date}</Text>
              <Text style={styles.detailSub}>Departure at {fare.time}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.warning[50] }]}>
              <Ionicons name="people" size={20} color={colors.warning[500]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Passengers</Text>
              <Text style={styles.detailValue}>{fare.passengers} Passengers</Text>
            </View>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare Breakdown</Text>

          <LinearGradient
            colors={[colors.success[50], colors.primary[50]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pricingBanner}
          >
            <Ionicons name="checkmark-circle" size={20} color={colors.success[600]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pricingTitle}>Transparent ₹/km Pricing</Text>
              <Text style={styles.pricingText}>
                You pay only ₹{fare.ratePerKm}/km × {fare.distance} km = ₹{fare.baseFare}. No hidden charges!
              </Text>
            </View>
          </LinearGradient>

          <FareRow label="Base Fare" amount={fare.baseFare} />
          <FareRow label="GST (9%)" amount={fare.gst} />
          <FareRow label="Platform Fee" amount={0} isFree />

          <FareRow label="Total Amount" amount={fare.totalFare} isTotal />
        </View>

        {/* Amenities */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What's Included</Text>
          <View style={styles.amenitiesGrid}>
            {['AC', 'WiFi', 'Charging Port', 'Water Bottle'].map((amenity) => (
              <View key={amenity} style={styles.amenityItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success[600]} />
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>Cancellation Policy</Text>
          <Text style={styles.policyText}>
            Free cancellation up to 24 hours before departure. 50% refund if
            cancelled within 12-24 hours.
          </Text>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      <Animated.View
        style={[
          styles.bottomBar,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.bottomLabel}>Total Amount</Text>
            <Text style={styles.bottomAmount}>₹{fare.totalFare}</Text>
          </View>
          <GradientButton
            title="Confirm Booking"
            onPress={() => router.push('/(booking)/confirmation')}
            fullWidth={false}
          />
        </View>
      </Animated.View>
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
    marginTop: -spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderRadius: radii.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
    marginBottom: spacing.base,
  },
  badge: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.primary[600],
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  detailValue: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
    marginTop: 1,
  },
  detailSub: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[600],
    marginTop: 2,
  },
  pricingBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.base,
  },
  pricingTitle: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.success[700],
    marginBottom: 2,
  },
  pricingText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.success[600],
    lineHeight: 20,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '45%',
  },
  amenityText: {
    fontSize: typography.sizes.base,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[700],
  },
  policyCard: {
    backgroundColor: colors.primary[50],
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: spacing.base,
  },
  policyTitle: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.primary[800],
    marginBottom: spacing.sm,
  },
  policyText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.primary[700],
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    padding: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  bottomAmount: {
    fontSize: 24,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.neutral[900],
    marginTop: 2,
  },
});
