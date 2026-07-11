import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';

interface SearchCardProps {
  from?: string;
  to?: string;
  onPress: () => void;
}

export function SearchCard({ from, to, onPress }: SearchCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary[50] }]}>
          <Ionicons name="location" size={20} color={colors.primary[600]} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>From</Text>
          <Text style={styles.value}>{from || 'Select pickup location'}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: colors.success[50] }]}>
          <Ionicons name="location" size={20} color={colors.success[600]} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>To</Text>
          <Text style={styles.value}>{to || 'Select destination'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  value: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.neutral[900],
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.md,
  },
});
