import React, { useState, useRef, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../../components/ui/GradientButton';
import { verifyOtp } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';

const OTP_LENGTH = 6;

export default function OtpVerification() {
  const router = useRouter();
  const { phone, otp: correctOtp } = useLocalSearchParams<{ phone: string; otp: string }>();
  const { setUser, setLoading, isLoading } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      text = text.slice(-1);
    }
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError('');

    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      setError('Please enter the complete OTP');
      return;
    }

    setLoading(true);
    const { data, error: apiError } = await verifyOtp(phone || '', otpString);

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return;
    }

    setUser(data);
    setSuccess(true);

    setTimeout(() => {
      router.replace('/(tabs)');
    }, 1500);
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  const maskedPhone = phone
    ? `+91 ${phone.slice(0, 2)}****${phone.slice(6)}`
    : '+91 *******  ';

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
          {success ? (
            <View style={styles.successContainer}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success[500]} />
              </View>
              <Text style={styles.successTitle}>Verified!</Text>
              <Text style={styles.successText}>Taking you to the app...</Text>
            </View>
          ) : (
            <>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null,
                      error ? styles.otpInputError : null,
                    ]}
                  />
                ))}
              </View>

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <GradientButton
                title="Verify"
                onPress={handleVerify}
                disabled={otp.join('').length !== OTP_LENGTH}
                loading={isLoading}
              />

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary[600]} />
                <Text style={styles.hintText}>
                  For demo, use OTP: {correctOtp || '123456'}
                </Text>
              </View>
            </>
          )}
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
    lineHeight: 24,
  },
  phoneHighlight: {
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[800],
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
    textAlign: 'center',
    fontSize: 24,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.neutral[900],
  },
  otpInputFilled: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  otpInputError: {
    borderColor: colors.danger[600],
    backgroundColor: colors.danger[50],
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.danger[600],
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  resendText: {
    fontSize: typography.sizes.base,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
  resendLink: {
    fontSize: typography.sizes.base,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.primary[600],
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    padding: spacing.base,
    backgroundColor: colors.primary[50],
    borderRadius: radii.md,
  },
  hintText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.primary[700],
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
  },
});
