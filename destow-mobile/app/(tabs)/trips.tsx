import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppColors, Spacing, Typography } from '../../constants/design-tokens';

export default function TripsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="book-open" size={48} color={AppColors.accent} />
        </View>
        <Text style={styles.title}>Your Trips</Text>
        <Text style={styles.subtitle}>No upcoming trips found.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: AppColors.cardBgLight,
    borderRadius: 50,
  },
  title: {
    ...Typography.screenTitle,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
});
