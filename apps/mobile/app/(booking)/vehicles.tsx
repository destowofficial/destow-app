import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientHeader } from '../../components/ui/GradientHeader';
import { FilterTabs } from '../../components/ui/FilterTabs';
import { VehicleCard } from '../../components/cards/VehicleCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useBookingStore } from '../../stores/useBookingStore';
import { searchVehicles } from '../../services/api';
import type { Vehicle } from '../../services/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function VehicleSelection() {
  const router = useRouter();
  const { fromCity, toCity, distance, selectedVehicle, selectVehicle } = useBookingStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedVehicle]);

  const loadVehicles = async () => {
    setLoading(true);
    const { data } = await searchVehicles({
      from: fromCity,
      to: toCity,
      date: '',
      passengers: 1,
    });
    setVehicles(data);
    setLoading(false);
  };

  const filtered = filter === 'All'
    ? vehicles
    : vehicles.filter((v) => v.category === filter);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GradientHeader
        title="Select Vehicle"
        subtitle={`${fromCity} → ${toCity} • ${distance} km`}
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.tabsContainer}>
        <FilterTabs
          tabs={['All', 'Bus', 'Car']}
          activeTab={filter}
          onTabChange={setFilter}
          variant="header"
        />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {loading ? (
            <LoadingSkeleton count={4} variant="card" />
          ) : (
            filtered.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                selected={selectedVehicle?.id === vehicle.id}
                onPress={() => selectVehicle(vehicle)}
                distance={distance}
              />
            ))
          )}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {selectedVehicle && (
        <Animated.View
          style={[
            styles.bottomBar,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <GradientButton
            title="Continue to Fare Details"
            onPress={() => router.push('/(booking)/fare')}
          />
        </Animated.View>
      )}
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
});
