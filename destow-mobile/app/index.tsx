import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { router } from 'expo-router';
import { AppColors, Spacing, Radii, Shadows, Typography, CommonStyles } from '../constants/design-tokens';
import { Feather } from '@expo/vector-icons';

export default function LoginScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!name.trim() || cleanPhone.length !== 10) {
      setError('Please enter a valid name and 10-digit\nphone number.');
      return;
    }
    setError('');
    setIsLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      setIsLoading(false);
      router.push({ pathname: '/otp', params: { phone: cleanPhone, name: name.trim() } });
    }, 800);
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
            <View style={styles.inputWrapper}>
              <Feather name="user" size={20} color={AppColors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={AppColors.placeholder}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Feather name="phone-call" size={20} color={AppColors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={AppColors.placeholder}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={15}
                editable={!isLoading}
              />
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={AppColors.background} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Get OTP</Text>
                  <Feather name="arrow-right" size={20} color={AppColors.background} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
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
  header: { alignItems: 'center', marginBottom: Spacing.xxl, marginTop: Spacing.xxl },
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
  formContainer: { width: '100%' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: AppColors.inputBg,
    borderRadius: Radii.input,
    borderWidth: 1, borderColor: AppColors.border,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, paddingVertical: 18, fontSize: 16, color: AppColors.brand, fontWeight: '500' },
  errorText: { fontSize: 14, color: AppColors.error, marginBottom: Spacing.xl, marginTop: -Spacing.sm },
  button: {
    ...CommonStyles.primaryButton,
    flexDirection: 'row', justifyContent: 'center',
    marginTop: Spacing.md, borderRadius: Radii.card,
  },
  buttonText: { ...Typography.buttonText, color: AppColors.background, fontSize: 18 },
});
