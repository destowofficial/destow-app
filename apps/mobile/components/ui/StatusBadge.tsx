import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii } from '../../theme/spacing';

type Status = 'upcoming' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { icon: string; label: string; color: string; bg: string; border: string }> = {
  upcoming: {
    icon: 'time-outline',
    label: 'Upcoming',
    color: colors.primary[600],
    bg: colors.primary[50],
    border: colors.primary[200],
  },
  completed: {
    icon: 'checkmark-circle-outline',
    label: 'Completed',
    color: colors.success[600],
    bg: colors.success[50],
    border: colors.success[100],
  },
  cancelled: {
    icon: 'close-circle-outline',
    label: 'Cancelled',
    color: colors.danger[600],
    bg: colors.danger[50],
    border: '#fecaca',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Ionicons name={config.icon as any} size={14} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_500Medium`,
  },
});
