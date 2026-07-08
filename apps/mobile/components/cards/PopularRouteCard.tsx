import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';
import type { PopularRoute } from '../../services/types';

interface PopularRouteCardProps {
  route: PopularRoute;
  onPress: () => void;
}

export function PopularRouteCard({ route, onPress }: PopularRouteCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.container}>
      <ImageWithFallback source={{ uri: route.imageUrl }} style={styles.image} />
      <View style={styles.info}>
        <View style={styles.routeRow}>
          <Text style={styles.city}>{route.from}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.neutral[400]} />
          <Text style={styles.city}>{route.to}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.metaText}>{route.distance}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.metaText}>{route.duration}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.fare}>{route.fare}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.warning[500]} />
            <Text style={styles.rating}>4.8</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ImageWithFallback({ source, style }: { source: { uri: string }; style: any }) {
  const [error, setError] = React.useState(false);
  if (error) {
    return <View style={[style, { backgroundColor: colors.neutral[200] }]} />;
  }
  return <Image source={source} style={style} onError={() => setError(true)} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...shadows.sm,
  },
  image: {
    width: 112,
    height: 112,
  },
  info: {
    flex: 1,
    padding: spacing.base,
    justifyContent: 'center',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  city: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.base,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fare: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.success[600],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.neutral[700],
  },
});
