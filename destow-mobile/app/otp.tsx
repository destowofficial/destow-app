import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';

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
      <View style={styles.topMapContainer}>
        {/* Placeholder for the world map image at the top */}
        <View style={styles.mapPlaceholder}>
          <Text style={{fontSize: 80, opacity: 0.1}}>🗺️</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <View style={styles.logoSquare}>
            <Text style={styles.logoText}>Destow</Text>
          </View>
        </View>

        <Text style={styles.title}>OTP</Text>

        <View style={styles.formContainer}>
          <TextInput 
            style={styles.input}
            placeholder="Enter OTP"
            placeholderTextColor="#888"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topMapContainer: {
    height: '35%',
    width: '100%',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E6EFF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 30,
    marginTop: -40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoSquare: {
    width: 80,
    height: 80,
    backgroundColor: '#1A1D20',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  logoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    fontStyle: 'italic',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: '#8A8D91',
    marginTop: 10,
    marginBottom: 20,
    letterSpacing: 2,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#D9D9D9',
    borderRadius: 12,
    padding: 18,
    fontSize: 18,
    marginBottom: 40,
    color: '#333',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
