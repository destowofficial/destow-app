import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppColors, Spacing, Radii, Shadows, Typography } from '../constants/design-tokens';
import { useEffect, useState } from 'react';
import { getAvailableCabs, Cab, bookCab, processPayment } from '../services/cabs.service';

// Map backend imageKey (cab type name) to local assets
const CAB_IMAGES: Record<string, any> = {
  sedan: require('../assets/images/sedan.png'),
  suv: require('../assets/images/suv.png'),
};

function getCabImage(imageKey: string | null) {
  if (!imageKey) return require('../assets/images/sedan.png');
  const key = imageKey.toLowerCase();
  return CAB_IMAGES[key] ?? require('../assets/images/sedan.png');
}

export default function CabListingScreen() {
  const params = useLocalSearchParams<{
    from: string;
    to: string;
    date: string;
    time: string;
    distanceKm: string;
  }>();

  const [cabs, setCabs] = useState<Cab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingCabId, setBookingCabId] = useState<string | null>(null);

  const from = params.from ?? 'Origin';
  const to = params.to ?? 'Destination';
  const distanceKm = parseFloat(params.distanceKm ?? '0');

  useEffect(() => {
    (async () => {
      try {
        const results = await getAvailableCabs(from, to, params.date ?? '', params.time ?? '', distanceKm);
        setCabs(results);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Could not load cabs. Is the backend running?');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleBook = async (cab: Cab) => {
    setBookingCabId(cab.id);
    try {
      // Build pickup datetime from date + time params
      const pickupDatetime = `${params.date ?? new Date().toISOString().split('T')[0]}T${params.time ?? '10:00'}:00+05:30`;
      const booking = await bookCab({
        cabId: cab.id,
        from,
        to,
        pickupDatetime,
        distanceKm: cab.distanceKm,
        totalFare: cab.totalFare,
        paymentMethod: 'upi',
      });

      // Auto-process payment (MVP flow)
      await processPayment(booking.id, 'upi');

      Alert.alert(
        '🎉 Booking Confirmed!',
        `Your ${cab.cabType.name} from ${from} to ${to} is booked.\nFare: ₹${cab.totalFare}`,
        [{ text: 'View Trips', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.message ?? 'Could not complete booking.');
    } finally {
      setBookingCabId(null);
    }
  };

  const handleBack = () => router.back();

  // Format date for display: "YYYY-MM-DD" → "Mon, DD Mon"
  const formatDisplayDate = () => {
    if (!params.date) return '';
    const d = new Date(params.date);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <View style={styles.container}>
      {/* Curved Teal Header */}
      <View style={styles.headerBackground}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Feather name="chevron-left" size={28} color={AppColors.background} />
            </TouchableOpacity>
            
            <View style={styles.headerTextContainer}>
              <View style={styles.routeRow}>
                <Text style={styles.routeText}>{from}</Text>
                <Feather name="arrow-right" size={20} color={AppColors.background} style={styles.routeIcon} />
                <Text style={styles.routeText}>{to}</Text>
              </View>
              <Text style={styles.dateText}>{formatDisplayDate()} • {params.time ?? ''}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.brand} />
          <Text style={styles.loadingText}>Finding cabs…</Text>
        </View>
      ) : cabs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Feather name="inbox" size={48} color={AppColors.textMuted} />
          <Text style={styles.loadingText}>No cabs available for this route.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
          {cabs.map((cab) => (
            <View key={cab.id} style={styles.cardWrapper}>
              <View style={styles.cardHeader}>
                <View style={styles.agencyBadge}>
                  <Text style={styles.agencyText}>{cab.agencyName.toUpperCase()}</Text>
                </View>
                {cab.driverAvailable && (
                  <View style={styles.driverBadge}>
                    <Feather name="check-circle" size={14} color="#10B981" style={{marginRight: 4}} />
                    <Text style={styles.driverText}>Driver</Text>
                  </View>
                )}
                <View style={{flex: 1}} />
                <View style={styles.distanceBadge}>
                  <Feather name="map-pin" size={12} color={AppColors.textMuted} style={{marginRight: 4}} />
                  <Text style={styles.distanceText}>{cab.distanceKm} km</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.carInfoRow}>
                  <View style={styles.carIconBox}>
                    <Image source={getCabImage(cab.cabType.imageKey)} style={styles.carImage} resizeMode="contain" />
                  </View>
                  
                  <View style={styles.carDetails}>
                    <Text style={styles.carName}>{cab.cabType.name}</Text>
                    <View style={styles.carFeaturesRow}>
                      <View style={styles.carFeature}>
                        <Feather name="users" size={14} color={AppColors.textMuted} />
                        <Text style={styles.carFeatureText}>{cab.cabType.seats} Seats</Text>
                      </View>
                      <View style={styles.carFeature}>
                        <Feather name="briefcase" size={14} color={AppColors.textMuted} />
                        <Text style={styles.carFeatureText}>{cab.cabType.bags} Bags</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.dashedDivider}>
                  <Text style={{color: AppColors.border}} numberOfLines={1}>
                    - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
                  </Text>
                </View>

                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>Estimated Fare</Text>
                    <Text style={styles.priceAmount}>₹{cab.totalFare}</Text>
                    <Text style={styles.priceSubtext}>Includes tolls & taxes</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => handleBook(cab)}
                    disabled={bookingCabId !== null}
                  >
                    {bookingCabId === cab.id ? (
                      <ActivityIndicator color={AppColors.background} />
                    ) : (
                      <Text style={styles.bookButtonText}>Book</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBackground: {
    backgroundColor: AppColors.brand,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  backButton: {
    marginRight: Spacing.md,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 20,
  },
  routeText: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.background,
  },
  routeIcon: {
    marginHorizontal: Spacing.sm,
  },
  dateText: {
    fontSize: 14,
    color: AppColors.background,
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: AppColors.textMuted,
    marginTop: Spacing.md,
  },
  scrollContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    paddingTop: Spacing.xl,
  },
  cardWrapper: {
    marginBottom: Spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  agencyBadge: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radii.chip,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: Spacing.sm,
  },
  agencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.brand,
    letterSpacing: 0.5,
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  cardContent: {
    backgroundColor: AppColors.background,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  carInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  carIconBox: {
    width: 64,
    height: 64,
    backgroundColor: AppColors.cardBgLight,
    borderRadius: Radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  carImage: {
    width: 64,
    height: 45,
  },
  carDetails: {
    flex: 1,
  },
  carName: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.brand,
    marginBottom: 4,
  },
  carFeaturesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  carFeatureText: {
    fontSize: 14,
    color: AppColors.textMuted,
    marginLeft: 6,
    fontWeight: '500',
  },
  dashedDivider: {
    overflow: 'hidden',
    height: 20,
    justifyContent: 'center',
    opacity: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
  },
  priceLabel: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginBottom: 2,
    fontWeight: '500',
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: AppColors.brand,
    marginBottom: 2,
  },
  priceSubtext: {
    fontSize: 10,
    color: AppColors.textMuted,
  },
  bookButton: {
    backgroundColor: AppColors.brand,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    ...Shadows.button,
  },
  bookButtonText: {
    color: AppColors.background,
    fontWeight: '700',
    fontSize: 16,
  },
});
