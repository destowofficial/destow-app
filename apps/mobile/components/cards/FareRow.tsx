import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface FareRowProps {
  label: string;
  amount: number;
  isHighlight?: boolean;
  isFree?: boolean;
  isTotal?: boolean;
}

export function FareRow({ label, amount, isHighlight, isFree, isTotal }: FareRowProps) {
  return (
    <View style={[styles.row, isTotal && styles.totalRow]}>
      <Text style={[styles.label, isTotal && styles.totalLabel]}>{label}</Text>
      {isFree ? (
        <Text style={styles.freeAmount}>₹0</Text>
      ) : (
        <Text style={[styles.amount, isTotal && styles.totalAmount]}>
          ₹{amount.toLocaleString('en-IN')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  totalRow: {
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    marginTop: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.base,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[600],
  },
  totalLabel: {
    fontSize: typography.sizes.lg,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
  },
  amount: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
  },
  totalAmount: {
    fontSize: 24,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.primary[600],
  },
  freeAmount: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
});
