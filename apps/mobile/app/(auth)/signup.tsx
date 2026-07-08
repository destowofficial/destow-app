import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../../components/ui/GradientButton';
import { signupUser, sendOtp } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';

interface FormField {
  label: string;
  value: string;
  error: string;
}

export default function Signup() {
  const router = useRouter();
  const { setPendingPhone, setLoading, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (phone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    const { data, error: apiError } = await signupUser({
      name: name.trim(),
      email: email.trim(),
      phone,
      dateOfBirth: dateOfBirth || undefined,
      referralCode: referralCode || undefined,
    });

    if (apiError) {
      setErrors({ general: apiError });
      setLoading(false);
      return;
    }

    const { data: otpData } = await sendOtp(phone);
    setPendingPhone(phone);
    setLoading(false);

    router.push({
      pathname: '/(auth)/otp',
      params: { phone, otp: otpData.otp },
    });
  };

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    setErrors((prev) => ({ ...prev, phone: '' }));
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

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Fill in your details to get started
          </Text>

          {errors.general ? (
            <View style={styles.generalError}>
              <Ionicons name="alert-circle" size={18} color={colors.danger[600]} />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          ) : null}

          {/* Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color={colors.neutral[400]} />
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Enter your full name"
                placeholderTextColor={colors.neutral[400]}
                style={styles.input}
              />
            </View>
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={colors.neutral[400]} />
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="Enter your email"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={[styles.phoneRow, errors.phone && styles.inputError]}>
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
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Date of Birth (Optional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color={colors.neutral[400]} />
              <TextInput
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.neutral[400]}
                style={styles.input}
              />
            </View>
          </View>

          {/* Referral Code */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Referral Code (Optional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="gift-outline" size={20} color={colors.neutral[400]} />
              <TextInput
                value={referralCode}
                onChangeText={setReferralCode}
                placeholder="Enter referral code"
                placeholderTextColor={colors.neutral[400]}
                autoCapitalize="characters"
                style={styles.input}
              />
            </View>
          </View>

          <GradientButton
            title="Create Account"
            onPress={handleSignup}
            loading={isLoading}
            icon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
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
    marginBottom: spacing.xl,
  },
  generalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.danger[50],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: spacing.base,
  },
  generalErrorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.danger[600],
  },
  fieldContainer: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: colors.neutral[50],
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  inputError: {
    borderColor: colors.danger[600],
    backgroundColor: colors.danger[50],
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[900],
    padding: 0,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.danger[600],
    marginTop: spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 56,
    backgroundColor: colors.neutral[50],
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.base,
  },
  countryCode: {
    height: 40,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
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
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[900],
    padding: 0,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  loginText: {
    fontSize: typography.sizes.base,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  loginLink: {
    fontSize: typography.sizes.base,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.primary[600],
  },
});
