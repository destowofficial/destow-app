import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '../components/ui/GradientButton';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';

export default function NotFound() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.primary.gradient as any}
        style={styles.header}
      >
        <Ionicons name="compass-outline" size={80} color={colors.white} />
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.errorCode}>404</Text>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.description}>
          Oops! The page you're looking for doesn't exist or has been moved.
        </Text>

        <View style={styles.buttonContainer}>
          <GradientButton
            title="Go to Home"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </View>

      <Text style={styles.footer}>DESTOW v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  errorCode: {
    fontSize: 72,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.primary[600],
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.neutral[900],
    marginBottom: spacing.base,
  },
  description: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
  },
  footer: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[400],
    paddingBottom: spacing.xxl,
  },
});
