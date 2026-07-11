import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii } from '../../theme/spacing';

interface FilterTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: 'header' | 'default';
}

export function FilterTabs({ tabs, activeTab, onTabChange, variant = 'default' }: FilterTabsProps) {
  const isHeader = variant === 'header';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onTabChange(tab)}
            activeOpacity={0.7}
            style={[
              styles.tab,
              isHeader && styles.headerTab,
              isActive && (isHeader ? styles.activeHeaderTab : styles.activeTab),
              !isActive && isHeader && styles.inactiveHeaderTab,
            ]}
          >
            <Text
              style={[
                styles.label,
                isHeader && styles.headerLabel,
                isActive && (isHeader ? styles.activeHeaderLabel : styles.activeLabel),
                !isActive && isHeader && styles.inactiveHeaderLabel,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.neutral[100],
  },
  activeTab: {
    backgroundColor: colors.primary[600],
    ...Platform.select({
      ios: { shadowColor: colors.primary[600], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.neutral[600],
  },
  activeLabel: {
    color: colors.white,
  },
  headerTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  activeHeaderTab: {
    backgroundColor: colors.white,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  inactiveHeaderTab: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerLabel: {
    fontSize: typography.sizes.base,
  },
  activeHeaderLabel: {
    color: colors.primary[600],
  },
  inactiveHeaderLabel: {
    color: colors.white,
  },
});
