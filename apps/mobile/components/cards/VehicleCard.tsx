import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image as RNImage } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';
import { AmenityChip } from '../ui/AmenityChip';
import type { Vehicle } from '../../services/types';

interface VehicleCardProps {
  vehicle: Vehicle;
  selected?: boolean;
  onPress: () => void;
  distance: number;
}

export function VehicleCard({ vehicle, selected, onPress, distance }: VehicleCardProps) {
  const estimatedFare = vehicle.ratePerKm * distance;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, selected && styles.selected]}
    >
      <View style={styles.imageContainer}>
        <ImageWithFallback source={{ uri: vehicle.imageUrl }} style={styles.image} />
      </View>

      <View style={styles.info}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.type}>{vehicle.type}</Text>
            <View style={styles.capacityRow}>
              <Ionicons name="people-outline" size={14} color={colors.neutral[500]} />
              <Text style={styles.capacity}>{vehicle.capacity}</Text>
            </View>
          </View>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={colors.warning[500]} />
            <Text style={styles.rating}>{vehicle.rating}</Text>
          </View>
        </View>

        <View style={styles.amenities}>
          {vehicle.amenities.map((amenity) => (
            <AmenityChip key={amenity} label={amenity} />
          ))}
        </View>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.rateLabel}>Rate</Text>
            <View style={styles.rateValue}>
              <Text style={styles.rateAmount}>₹{vehicle.ratePerKm}</Text>
              <Text style={styles.rateUnit}>/km</Text>
            </View>
          </View>
          <View style={styles.estimatedContainer}>
            <Text style={styles.estimatedLabel}>Estimated Fare</Text>
            <Text style={styles.estimatedAmount}>₹{estimatedFare}</Text>
          </View>
        </View>
      </View>

      {selected && (
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={18} color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function ImageWithFallback({ source, style }: { source: { uri: string }; style: any }) {
  const [error, setError] = React.useState(false);
  if (error) {
    return <View style={[style, { backgroundColor: colors.neutral[200] }]} />;
  }
  return (
    <RNImage
      source={source}
      style={style}
      onError={() => setError(true)}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.neutral[100],
    ...shadows.sm,
  },
  selected: {
    borderColor: colors.primary[600],
    ...shadows.lg,
  },
  imageContainer: {
    height: 192,
    backgroundColor: colors.neutral[100],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: {
    padding: spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  type: {
    fontSize: typography.sizes.lg,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  capacity: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: typography.sizes.base,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  rateLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  rateValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  rateAmount: {
    fontSize: 22,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.success[600],
  },
  rateUnit: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  estimatedContainer: {
    alignItems: 'flex-end',
  },
  estimatedLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  estimatedAmount: {
    fontSize: typography.sizes.lg,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
  },
  checkCircle: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
