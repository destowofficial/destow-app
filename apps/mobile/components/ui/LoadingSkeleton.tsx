import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';

interface LoadingSkeletonProps {
  count?: number;
  variant?: 'card' | 'listItem';
}

export function LoadingSkeleton({ count = 3, variant = 'card' }: LoadingSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} delay={i * 150} variant={variant} />
      ))}
    </View>
  );
}

function SkeletonItem({ delay, variant }: { delay: number; variant: string }) {
  const opacity = React.useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    const timer = setTimeout(() => animation.start(), delay);
    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [delay, opacity]);

  if (variant === 'listItem') {
    return (
      <Animated.View style={[styles.listItem, { opacity }]}>
        <View style={styles.listImage} />
        <View style={styles.listContent}>
          <View style={styles.lineWide} />
          <View style={styles.lineMedium} />
          <View style={styles.lineNarrow} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.imagePlaceholder} />
      <View style={styles.content}>
        <View style={styles.lineWide} />
        <View style={styles.lineMedium} />
        <View style={styles.lineNarrow} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.base,
    gap: spacing.base,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  imagePlaceholder: {
    height: 180,
    backgroundColor: colors.neutral[200],
  },
  content: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  listItem: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    flexDirection: 'row',
    padding: spacing.base,
    gap: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listImage: {
    width: 96,
    height: 96,
    borderRadius: radii.md,
    backgroundColor: colors.neutral[200],
  },
  listContent: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  lineWide: {
    height: 14,
    width: '80%',
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  lineMedium: {
    height: 12,
    width: '60%',
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  lineNarrow: {
    height: 12,
    width: '40%',
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
});
