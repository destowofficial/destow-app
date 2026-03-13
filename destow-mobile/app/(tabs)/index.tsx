import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  const handleBook = () => {
    // Navigate to cab listing screen
    router.push('/cab-listing');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          <View style={styles.header}>
            <Text style={styles.logoText}>DESTOW</Text>
          </View>

          {/* Map Background Pattern Placeholder */}
          <View style={styles.mapBackground}>
            <Text style={{fontSize: 200, opacity: 0.05}}>🗺️</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FROM</Text>
              <TextInput 
                style={styles.input}
                placeholder="DELHI"
                placeholderTextColor="#A0A0A0"
                value={from}
                onChangeText={setFrom}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TO</Text>
              <TextInput 
                style={styles.input}
                placeholder=""
                value={to}
                onChangeText={setTo}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PICKUP</Text>
              <TextInput 
                style={styles.input}
                placeholder="04/03/2026"
                placeholderTextColor="#A0A0A0"
                value={pickupDate}
                onChangeText={setPickupDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PICKUP AT</Text>
              <TextInput 
                style={styles.input}
                placeholder="7:00 AM"
                placeholderTextColor="#A0A0A0"
                value={pickupTime}
                onChangeText={setPickupTime}
              />
            </View>

            <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
              <Text style={styles.bookButtonText}>BOOK</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
  },
  mapBackground: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#D3D3D3',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#A6D4EA',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 40,
  },
  bookButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },
});
