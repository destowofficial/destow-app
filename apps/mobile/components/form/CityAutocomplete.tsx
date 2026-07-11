import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii } from '../../theme/spacing';

interface CityAutocompleteProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (city: string) => void;
  placeholder: string;
  cities: string[];
  iconColor?: string;
}

export function CityAutocomplete({
  label,
  value,
  onChangeText,
  onSelect,
  placeholder,
  cities,
  iconColor = colors.primary[600],
}: CityAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = cities.filter((c) =>
    c.toLowerCase().includes(value.toLowerCase())
  );

  const handleSelect = (city: string) => {
    onSelect(city);
    onChangeText(city);
    setShowDropdown(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, isFocused && { borderColor: iconColor }]}>
        <Ionicons name="location" size={20} color={iconColor} style={styles.inputIcon} />
        <TextInput
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            setShowDropdown(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setShowDropdown(true);
          }}
          onBlur={() => setTimeout(() => { setIsFocused(false); setShowDropdown(false); }, 200)}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[400]}
          style={styles.input}
        />
      </View>
      {showDropdown && filtered.length > 0 && (
        <View style={styles.dropdown}>
          {filtered.slice(0, 6).map((city) => (
            <TouchableOpacity
              key={city}
              onPress={() => handleSelect(city)}
              activeOpacity={0.7}
              style={styles.dropdownItem}
            >
              <Ionicons name="location-outline" size={16} color={colors.neutral[400]} />
              <Text style={styles.dropdownText}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    zIndex: 100,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: colors.neutral[50],
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: spacing.base,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[900],
    padding: 0,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginTop: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  dropdownText: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[900],
  },
});
