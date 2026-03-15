import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { AppColors, Spacing, Radii, Shadows, Typography, CommonStyles } from '../constants/design-tokens';


export default function OtpScreen() {
  const [otp, setOtp] = useState('');

  const handleLogin = () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP.');
      return;
    }
    console.log('Verifying OTP', otp);
    // On success, go to home/tabs
    router.replace('/(tabs)');
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

          <Text style={styles.title}>OTP</Text>

          <View style={styles.formContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Enter OTP"
              placeholderTextColor={AppColors.placeholder}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              secureTextEntry={true}
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>LOGIN</Text>
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
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    marginTop: -40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
    color: AppColors.textMuted,
    marginBottom: Spacing.lg,
    letterSpacing: 2,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    ...CommonStyles.input,
    fontSize: 24,
    marginBottom: Spacing.xl,
    fontWeight: '700',
    backgroundColor: AppColors.inputBg,
  },
  button: {
    ...CommonStyles.primaryButton,
  },
  buttonText: {
    ...Typography.buttonText,
    color: AppColors.background,
  },
});
