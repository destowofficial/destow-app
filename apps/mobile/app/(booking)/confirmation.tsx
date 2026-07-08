import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../../components/ui/GradientButton';
import { createBooking } from '../../services/api';
import type { BookingDetails } from '../../services/types';
import { useBookingStore } from '../../stores/useBookingStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';

export default function BookingConfirmation() {
  const router = useRouter();
  const resetBooking = useBookingStore((s) => s.resetBooking);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [showSuccess, setShowSuccess] = useState(true);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  useEffect(() => {
    loadBooking();
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
      }),
    ]).start();

    const timer = setTimeout(() => setShowSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (booking) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [booking]);

  const loadBooking = async () => {
    const { data } = await createBooking();
    setBooking(data);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Success Animation */}
      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark-circle" size={80} color={colors.white} />
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <LinearGradient
        colors={[colors.success.gradientStart, colors.success.gradientEnd] as any}
        style={styles.header}
      >
        <Ionicons name="checkmark-circle" size={64} color={colors.white} />
        <Text style={styles.headerTitle}>Booking Confirmed!</Text>
        <Text style={styles.headerSubtitle}>Your trip has been successfully booked</Text>
      </LinearGradient>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {booking && (
          <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
            {/* Booking ID */}
            <View style={styles.card}>
              <View style={styles.bookingIdSection}>
                <Text style={styles.bookingIdLabel}>Booking ID</Text>
                <Text style={styles.bookingIdValue}>{booking.bookingId}</Text>
                <Text style={styles.statusBadge}>{booking.status}</Text>
              </View>
            </View>

            {/* Driver Details */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={20} color={colors.primary[600]} />
                <Text style={styles.sectionTitle}>Driver Details</Text>
              </View>

              <View style={styles.driverRow}>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverLabel}>Driver Name</Text>
                  <Text style={styles.driverValue}>{booking.driverName}</Text>
                </View>
                <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
                  <Ionicons name="call" size={20} color={colors.primary[600]} />
                </View>
              </View>

              <View style={styles.driverRow}>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverLabel}>Phone Number</Text>
                  <Text style={styles.driverValue}>{booking.driverPhone}</Text>
                </View>
                <View style={[styles.actionIcon, { backgroundColor: colors.success[50] }]}>
                  <Ionicons name="chatbubble" size={20} color={colors.success[600]} />
                </View>
              </View>

              <View style={styles.vehicleRow}>
                <View style={styles.vehicleIcon}>
                  <Ionicons name="car" size={24} color={colors.neutral[600]} />
                </View>
                <View>
                  <Text style={styles.driverLabel}>Vehicle</Text>
                  <Text style={styles.driverValue}>{booking.vehicleType}</Text>
                  <Text style={styles.vehicleNumber}>{booking.vehicleNumber}</Text>
                </View>
              </View>
            </View>

            {/* Trip Details */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Trip Details</Text>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.primary[50] }]}>
                  <Ionicons name="location" size={20} color={colors.primary[600]} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>From</Text>
                  <Text style={styles.detailValue}>{booking.from}</Text>
                  <Text style={styles.detailSub}>{booking.pickupPoint}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.success[50] }]}>
                  <Ionicons name="location" size={20} color={colors.success[600]} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>To</Text>
                  <Text style={styles.detailValue}>{booking.to}</Text>
                </View>
              </View>

              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeItem}>
                  <Ionicons name="calendar-outline" size={18} color={colors.neutral[400]} />
                  <View>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{booking.date}</Text>
                  </View>
                </View>
                <View style={styles.dateTimeItem}>
                  <Ionicons name="time-outline" size={18} color={colors.neutral[400]} />
                  <View>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{booking.time}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Payment Summary */}
            <LinearGradient
              colors={[colors.primary[50], colors.success[50]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.paymentCard}
            >
              <View>
                <Text style={styles.paymentLabel}>Total Paid</Text>
                <Text style={styles.paymentAmount}>₹{booking.fare}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={48} color={colors.success[600]} />
            </LinearGradient>

            {/* Action Buttons */}
            <View style={styles.actionGrid}>
              <GradientButton
                title="Download"
                onPress={() => {}}
                variant="secondary"
                icon={<Ionicons name="download-outline" size={20} color={colors.neutral[700]} />}
                fullWidth={false}
              />
              <GradientButton
                title="Share"
                onPress={() => {}}
                variant="secondary"
                icon={<Ionicons name="share-outline" size={20} color={colors.neutral[700]} />}
                fullWidth={false}
              />
            </View>

            <GradientButton
              title="View My Trips"
              onPress={() => {
                resetBooking();
                router.replace('/(tabs)/trips');
              }}
            />
            <View style={{ height: spacing.md }} />
            <GradientButton
              title="Book Another Trip"
              onPress={() => {
                resetBooking();
                router.replace('/(tabs)');
              }}
              variant="secondary"
            />

            <View style={{ height: spacing.xxxl }} />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.success[500],
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  successCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.success[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.white,
    marginTop: spacing.base,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    marginTop: -spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xxl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  bookingIdSection: {
    alignItems: 'center',
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  bookingIdLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  bookingIdValue: {
    fontSize: 24,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  statusBadge: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.success[600],
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
    marginBottom: spacing.base,
  },
  driverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  driverInfo: {
    flex: 1,
  },
  driverLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  driverValue: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
    marginTop: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleNumber: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[600],
    marginTop: 1,
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
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  paymentLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[600],
    marginBottom: 2,
  },
  paymentAmount: {
    fontSize: 30,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.neutral[900],
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.base,
    marginBottom: spacing.base,
  },
});
