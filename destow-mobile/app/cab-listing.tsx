import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Radii, Shadows, Typography, CommonStyles } from '../constants/design-tokens';

export default function CabListingScreen() {
  const [denomination, setDenomination] = useState('₹');
  const [sedanAmount, setSedanAmount] = useState('60');
  const [suvAmount, setSuvAmount] = useState('100');
  const [unitOfDistance, setUnitOfDistance] = useState('/km');

  const handleBack = () => {
    router.back();
  };

  const handleBook = () => {
    console.log('Book clicked');
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
                <Text style={styles.routeText}>Delhi</Text>
                <Feather name="arrow-right" size={20} color={AppColors.background} style={styles.routeIcon} />
                <Text style={styles.routeText}>Jaipur</Text>
              </View>
              <Text style={styles.dateText}>Mon, 16 Mar • 10:00</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
        
        {/* Cab Card 1 - Sedan */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardHeader}>
            <View style={styles.agencyBadge}>
              <Text style={styles.agencyText}>SWIFT TRAVELS</Text>
            </View>
            <View style={styles.driverBadge}>
              <Feather name="check-circle" size={14} color="#10B981" style={{marginRight: 4}} />
              <Text style={styles.driverText}>Driver</Text>
            </View>
            <View style={{flex: 1}} />
            <View style={styles.distanceBadge}>
              <Feather name="map-pin" size={12} color={AppColors.textMuted} style={{marginRight: 4}} />
              <Text style={styles.distanceText}>280 km</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            
            {/* Top row of card content: Icon/Image + Name/Details */}
            <View style={styles.carInfoRow}>
              <View style={styles.carIconBox}>
                <Image source={require('../assets/images/sedan.png')} style={styles.carImage} resizeMode="contain" />
              </View>
              
              <View style={styles.carDetails}>
                <Text style={styles.carName}>Sedan</Text>
                <View style={styles.carFeaturesRow}>
                  <View style={styles.carFeature}>
                    <Feather name="users" size={14} color={AppColors.textMuted} />
                    <Text style={styles.carFeatureText}>4 Seats</Text>
                  </View>
                  <View style={styles.carFeature}>
                    <Feather name="briefcase" size={14} color={AppColors.textMuted} />
                    <Text style={styles.carFeatureText}>2 Bags</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Dashed divider */}
            <View style={styles.dashedDivider}>
              <Text style={{color: AppColors.border}} numberOfLines={1}>
                - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
              </Text>
            </View>

            {/* Bottom row: Price + Book Button */}
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>Estimated Fare</Text>
                <Text style={styles.priceAmount}>{denomination}{sedanAmount}{unitOfDistance}</Text>
                <Text style={styles.priceSubtext}>Includes tolls & taxes</Text>
              </View>
              
              <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
                <Text style={styles.bookButtonText}>Book</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* Cab Card 2 - SUV */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardHeader}>
            <View style={styles.agencyBadge}>
              <Text style={styles.agencyText}>SWIFT TRAVELS</Text>
            </View>
            <View style={styles.driverBadge}>
              <Feather name="check-circle" size={14} color="#10B981" style={{marginRight: 4}} />
              <Text style={styles.driverText}>Driver</Text>
            </View>
            <View style={{flex: 1}} />
            <View style={styles.distanceBadge}>
              <Feather name="map-pin" size={12} color={AppColors.textMuted} style={{marginRight: 4}} />
              <Text style={styles.distanceText}>280 km</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            
            <View style={styles.carInfoRow}>
              <View style={styles.carIconBox}>
                 <Image source={require('../assets/images/suv.png')} style={styles.carImage} resizeMode="contain" />
              </View>
              
              <View style={styles.carDetails}>
                <Text style={styles.carName}>SUV</Text>
                <View style={styles.carFeaturesRow}>
                  <View style={styles.carFeature}>
                    <Feather name="users" size={14} color={AppColors.textMuted} />
                    <Text style={styles.carFeatureText}>6 Seats</Text>
                  </View>
                  <View style={styles.carFeature}>
                    <Feather name="briefcase" size={14} color={AppColors.textMuted} />
                    <Text style={styles.carFeatureText}>2 Bags</Text>
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
                <Text style={styles.priceAmount}>{denomination}{suvAmount}{unitOfDistance}</Text>
                <Text style={styles.priceSubtext}>Includes tolls & taxes</Text>
              </View>
              
              <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
                <Text style={styles.bookButtonText}>Book</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Light grey background like in the image
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
    color: '#10B981', // Green 
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
    ...Shadows.button,
  },
  bookButtonText: {
    color: AppColors.background,
    fontWeight: '700',
    fontSize: 16,
  },
});
