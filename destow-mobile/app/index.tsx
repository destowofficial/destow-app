import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { AppColors, Spacing, Radii, Shadows, Typography, CommonStyles } from '../constants/design-tokens';

export default function LoginScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSendOTP = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please enter your name and phone number.');
      return;
    }
    // Simple placeholder for API call
    console.log('Sending OTP to', phone);
    router.push('/otp');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.topMapContainer} pointerEvents="none">
          <View style={styles.mapPlaceholder}>
            <Image 
              source={require('../assets/images/background.png')} 
              style={styles.watermarkImage}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.contentContainer}>
                  <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/icon.png')} 
              style={{width: 80, height: 80,}}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Sign in to continue.</Text>

          <View style={styles.formContainer}>
            <Text style={styles.label}>NAME</Text>
            <TextInput 
              style={styles.input}
              placeholder="Jiara Martins"
              placeholderTextColor={AppColors.placeholder}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput 
              style={styles.input}
              placeholder="******"
              placeholderTextColor={AppColors.placeholder}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
            />

            <TouchableOpacity style={styles.button} onPress={handleSendOTP}>
              <Text style={styles.buttonText}>Send OTP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  topMapContainer: {
    height: '35%',
    width: '100%',
    backgroundColor: AppColors.background,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AppColors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
  },
  watermarkImage: {
    width: '100%',
    height: '100%',
    opacity: 0.15,
    backgroundColor: AppColors.brand,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    marginTop: -40, // overlap with the map
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoSquare: {
    width: 80,
    height: 80,
    backgroundColor: AppColors.brand,
    borderRadius: Radii.logo,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  logoText: {
    color: AppColors.background,
    fontWeight: 'bold',
    fontSize: 18,
    fontStyle: 'italic',
  },
  title: {
    ...Typography.screenTitle,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  input: {
    ...CommonStyles.input,
    marginBottom: Spacing.lg,
  },
  button: {
    ...CommonStyles.primaryButton,
    marginTop: Spacing.sm,
  },
  buttonText: {
    ...Typography.buttonText,
    color: AppColors.background,
  },
});
