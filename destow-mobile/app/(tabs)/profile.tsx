import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppColors, Spacing, Radii, Shadows, Typography, CommonStyles } from '../../constants/design-tokens';

export default function ProfileScreen() {
  const handleLogout = () => {
    // In a real app, clear auth state here
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.headerTitle}>Profile</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Feather name="user" size={40} color={AppColors.background} />
          </View>
          <Text style={styles.userName}>Rahul Sharma</Text>
          <View style={styles.phoneContainer}>
            <Feather name="phone-call" size={14} color={AppColors.background} />
            <Text style={styles.userPhone}>+91 9876543210</Text>
          </View>
        </View>

        {/* Action Menu List */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color={AppColors.brand} />
            </View>
            <Text style={styles.menuText}>Safety & Security</Text>
            <Feather name="chevron-right" size={20} color={AppColors.textMuted} />
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Feather name="help-circle" size={20} color={AppColors.brand} />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
            <Feather name="chevron-right" size={20} color={AppColors.textMuted} />
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Feather name="settings" size={20} color={AppColors.brand} />
            </View>
            <Text style={styles.menuText}>Settings</Text>
            <Feather name="chevron-right" size={20} color={AppColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={AppColors.background} style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Destow v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  headerTitle: {
    ...Typography.screenTitle,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    fontSize: 28,
  },
  scrollContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  profileCard: {
    backgroundColor: AppColors.brand,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.background,
    marginBottom: Spacing.xs,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhone: {
    fontSize: 16,
    color: AppColors.background,
    marginLeft: Spacing.sm,
    opacity: 0.9,
  },
  menuContainer: {
    backgroundColor: AppColors.cardBgLight,
    borderRadius: Radii.card,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.brand,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginLeft: 70, // Align with text
  },
  logoutButton: {
    ...CommonStyles.primaryButton,
    backgroundColor: AppColors.error,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: AppColors.error,
  },
  logoutIcon: {
    marginRight: Spacing.sm,
  },
  logoutText: {
    ...Typography.buttonText,
    color: AppColors.background,
    fontSize: 18,
  },
  versionText: {
    textAlign: 'center',
    color: AppColors.textMuted,
    fontSize: 14,
    marginTop: Spacing.xl,
  },
});
