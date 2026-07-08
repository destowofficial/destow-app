import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../../components/ui/GradientButton';
import { sendOtp } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';

export default function Login() {
  const router = useRouter();
  const { setPendingPhone, setLoading, isLoading } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    setError('');
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    const { data, error: apiError } = await sendOtp(phone);

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return;
    }

    setPendingPhone(phone);
    setLoading(false);
    router.push({
      pathname: '/(auth)/otp',
      params: { phone, otp: data.otp },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={colors.primary.gradient as any}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to continue
          </Text>

          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={formatPhone}
              placeholder="Enter phone number"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.phoneInput}
            />
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Text style={styles.hint}>
            We'll send you a one-time password (OTP) to verify your number
          </Text>

          <GradientButton
            title="Send OTP"
            onPress={handleSendOtp}
            disabled={phone.length !== 10}
            loading={isLoading}
            icon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
          />

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Demo Accounts</Text>
            <Text style={styles.demoText}>
              Phone: 9876543210{'\n'}OTP: 123456
            </Text>
            <Text style={styles.demoText}>
              Phone: 9123456789{'\n'}OTP: 654321
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 120,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    ...shadows.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 22,
  },
  title: {
    fontSize: 28,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
    marginBottom: spacing.xxl,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  countryCode: {
    height: 56,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.neutral[50],
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
  },
  phoneInput: {
    flex: 1,
    height: 56,
    backgroundColor: colors.neutral[50],
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.base,
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[900],
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.danger[600],
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[400],
    marginBottom: spacing.xxl,
    lineHeight: 20,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  signupText: {
    fontSize: typography.sizes.base,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  signupLink: {
    fontSize: typography.sizes.base,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.primary[600],
  },
  demoSection: {
    marginTop: spacing.xxxl,
    padding: spacing.base,
    backgroundColor: colors.primary[50],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  demoTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.primary[700],
    marginBottom: spacing.sm,
  },
  demoText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.primary[600],
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
});
