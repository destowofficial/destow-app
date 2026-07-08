import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii } from '../../theme/spacing';

interface AmenityChipProps {
  label: string;
}

export function AmenityChip({ label }: AmenityChipProps) {
  return (
    <Text style={styles.chip}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    fontSize: typography.sizes.xs,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.neutral[700],
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
});
