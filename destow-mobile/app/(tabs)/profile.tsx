import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Typography, Radii, Shadows, CommonStyles } from '../../constants/design-tokens';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            <Feather name="user" size={48} color={AppColors.background} />
          </View>
          <Text style={styles.name}>Jiara Martins</Text>
          <Text style={styles.phone}>+91 9876543210</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Premium Member</Text>
          </View>
        </View>

        <View style={styles.menuGroup}>
          <Text style={styles.sectionTitle}>Account Setup</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Feather name="edit-2" size={20} color={AppColors.brand} />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Feather name="chevron-right" size={20} color={AppColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Feather name="map-pin" size={20} color={AppColors.brand} />
              <Text style={styles.menuItemText}>Saved Addresses</Text>
            </View>
            <Feather name="chevron-right" size={20} color={AppColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Feather name="credit-card" size={20} color={AppColors.brand} />
              <Text style={styles.menuItemText}>Payment Methods</Text>
            </View>
            <Feather name="chevron-right" size={20} color={AppColors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.xl,
  },
  headerCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.button,
  },
  name: {
    ...Typography.screenTitle,
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  phone: {
    ...Typography.body,
    color: AppColors.brand,
    opacity: 0.8,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: AppColors.cardBgLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.chip,
  },
  badgeText: {
    ...Typography.caption,
    color: AppColors.brand,
    fontWeight: '700',
  },
  sectionTitle: {
    ...Typography.label,
    marginBottom: Spacing.md,
  },
  menuGroup: {
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    ...Typography.body,
    fontWeight: '600',
    marginLeft: Spacing.md,
  },
  logoutButton: {
    ...CommonStyles.primaryButton,
    backgroundColor: AppColors.inputBg,
    marginTop: 'auto',
  },
  logoutButtonText: {
    ...Typography.buttonText,
    color: '#D32F2F', // Red for logout
  },
});
