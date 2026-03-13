import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';

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

        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Sign in to continue.</Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>NAME</Text>
          <TextInput 
            style={styles.input}
            placeholder="Jiara Martins"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput 
            style={styles.input}
            placeholder="******"
            placeholderTextColor="#888"
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
    marginTop: -40, // overlap with the map
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    color: '#1A1D20',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8A8D91',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A8D91',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#D9D9D9',
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    marginBottom: 24,
    color: '#333',
  },
  button: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
