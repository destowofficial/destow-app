import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii } from '../../theme/spacing';

interface ProfileMenuItemProps {
  iconName: string;
  label: string;
  description: string;
  onPress: () => void;
  color: string;
  isLast?: boolean;
}

export function ProfileMenuItem({
  iconName,
  label,
  description,
  onPress,
  color,
  isLast = false,
}: ProfileMenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, !isLast && styles.borderBottom]}
    >
      <Ionicons name={iconName as any} size={22} color={color} />
      <Text style={styles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.base + 2,
    paddingHorizontal: spacing.base,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  label: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.neutral[900],
  },
});
