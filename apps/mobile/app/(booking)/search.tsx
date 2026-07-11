import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientHeader } from '../../components/ui/GradientHeader';
import { CityAutocomplete } from '../../components/form/CityAutocomplete';
import { GradientButton } from '../../components/ui/GradientButton';
import { useBookingStore } from '../../stores/useBookingStore';
import { cityNames } from '../../data/cities';
import { getDistance } from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii } from '../../theme/spacing';

export default function SearchRoute() {
  const router = useRouter();
  const {
    fromCity, toCity, travelDate, passengers,
    setFromCity, setToCity, setTravelDate, setPassengers, swapCities, setDistance,
  } = useBookingStore();

  const canSearch = fromCity && toCity && travelDate;

  const handleSearch = () => {
    if (canSearch) {
      const dist = getDistance(fromCity, toCity);
      setDistance(dist);
      router.push('/(booking)/vehicles');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GradientHeader
        title="Book Your Trip"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <CityAutocomplete
            label="From"
            value={fromCity}
            onChangeText={setFromCity}
            onSelect={setFromCity}
            placeholder="Enter pickup city"
            cities={cityNames}
            iconColor={colors.primary[600]}
          />

          <TouchableOpacity
            onPress={swapCities}
            style={styles.swapButton}
            activeOpacity={0.7}
            accessibilityLabel="Swap cities"
          >
            <Ionicons name="swap-vertical" size={20} color={colors.white} />
          </TouchableOpacity>

          <CityAutocomplete
            label="To"
            value={toCity}
            onChangeText={setToCity}
            onSelect={setToCity}
            placeholder="Enter destination city"
            cities={cityNames}
            iconColor={colors.success[600]}
          />

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Travel Date</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color={colors.neutral[400]} style={styles.inputIcon} />
              <TouchableOpacity
                onPress={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setTravelDate(today);
                }}
                style={styles.dateInput}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateText, !travelDate && styles.placeholder]}>
                  {travelDate || 'Select travel date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Passengers</Text>
            <View style={styles.passengerRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setPassengers(num)}
                  style={[
                    styles.passengerOption,
                    passengers === num && styles.passengerActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.passengerText,
                      passengers === num && styles.passengerActiveText,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <GradientButton
            title="Search Vehicles"
            onPress={handleSearch}
            disabled={!canSearch}
            icon={<Ionicons name="search" size={20} color={colors.white} />}
          />
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Quick Tip</Text>
          <Text style={styles.tipText}>
            Book early for better vehicle options and transparent ₹/km pricing
            with no hidden charges!
          </Text>
        </View>
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
    marginTop: -spacing.md,
  },
  formCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    borderRadius: radii.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'visible',
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: -spacing.sm,
    zIndex: 10,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.base,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  dateInput: {
    height: 56,
    backgroundColor: colors.neutral[50],
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: spacing.base,
    paddingLeft: 48,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[900],
  },
  placeholder: {
    color: colors.neutral[400],
  },
  passengerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  passengerOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  passengerActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  passengerText: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.neutral[600],
  },
  passengerActiveText: {
    color: colors.primary[600],
  },
  tipCard: {
    backgroundColor: colors.primary[50],
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: spacing.xxxl,
  },
  tipTitle: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.primary[800],
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.primary[700],
    lineHeight: 20,
  },
});
