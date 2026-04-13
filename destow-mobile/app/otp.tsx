import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator, Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppColors, Spacing, Radii, Shadows, Typography, CommonStyles } from '../constants/design-tokens';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { verifyOtp } from '../services/auth.service';

export default function OtpScreen() {
  const { phone, name } = useLocalSearchParams<{ phone: string; name: string }>();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    setError('');
    setIsLoading(true);
    
    try {
      // Mock flow: bypass firebase, just call our backend mock endpoint or directly save token
      // Since Firebase is not integrated native, we'll simulate the successful login 
      // by just saving a dummy JWT so all other APIs work
      
      const mockBackendUser = {
        id: '123',
        name: name ?? 'Test User',
        phone: phone ?? '9999999999',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const mockToken = 'mock-jwt-token-dev';
      
      await login(mockToken, mockBackendUser);
      router.replace('/(tabs)');
      
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <Image
                  source={require('../assets/images/icon.png')}
                  style={{ width: 50, height: 50 }}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.title}>Welcome to Destow</Text>
            <Text style={styles.subtitle}>Your intercity travel, simplified.</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.phoneInfo}>
              Code sent to <Text style={{ fontWeight: '700', color: AppColors.brand }}>+91 {phone ?? '—'}</Text>
            </Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.changeNumberBtn}>
              <Text style={styles.changeNumberText}>Change Number</Text>
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="shield-check-outline" size={24} color={AppColors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E n t e r   6 - d i g i t"
                placeholderTextColor={AppColors.textMuted}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
              />
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={AppColors.background} />
              ) : (
                <Text style={styles.buttonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>
            
            <Text style={{ marginTop: Spacing.xl, color: AppColors.textMuted, fontSize: 13, textAlign: 'center' }}>
              Firebase Auth relies on native tools. Enter any 6 digits to proceed to the app using mock auth.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg + 8,
    justifyContent: 'center',
    paddingBottom: Spacing.xxl * 2,
  },
  header: { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.xxl },
  logoOuter: {
    width: 100, height: 100,
    backgroundColor: AppColors.accent,
    borderRadius: Radii.card,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  logoInner: {
    width: 60, height: 60,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.subtle,
  },
  title: { ...Typography.screenTitle, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, fontSize: 18, color: AppColors.textMuted, textAlign: 'center' },
  formContainer: { width: '100%', alignItems: 'center' },
  phoneInfo: { fontSize: 16, color: AppColors.textMuted, marginBottom: Spacing.sm },
  changeNumberBtn: { marginBottom: Spacing.xl },
  changeNumberText: { fontSize: 16, color: AppColors.brand, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: AppColors.background,
    borderRadius: Radii.input,
    borderWidth: 2, borderColor: AppColors.brand,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  inputIcon: { marginRight: Spacing.md },
  input: {
    flex: 1, paddingVertical: 18,
    fontSize: 20, color: AppColors.brand,
    fontWeight: '700', letterSpacing: 2,
  },
  errorText: { fontSize: 14, color: AppColors.error, marginBottom: Spacing.xl, alignSelf: 'flex-start' },
  button: {
    ...CommonStyles.primaryButton,
    width: '100%', borderRadius: Radii.card,
    marginTop: Spacing.xs,
  },
  buttonText: { ...Typography.buttonText, color: AppColors.background, fontSize: 18 },
});
