import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { AppColors, Spacing, Shadows, Typography, CommonStyles } from '../../constants/design-tokens';

export default function HomeScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  
  // Date/Time state
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  
  // Picker visibility state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleBook = () => {
    // Navigate to cab listing screen
    router.push('/cab-listing');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    // Hide picker immediately on Android after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    // Hide picker immediately on Android after selection
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const formatDate = (dateObj: Date) => {
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeObj: Date) => {
    return timeObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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

          <View style={styles.mapBackground} pointerEvents="none">
            <Image 
              source={require('../../assets/images/background.png')} 
              style={styles.watermarkImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FROM</Text>
              <TextInput 
                style={styles.input}
                placeholder="NEW DELHI"
                placeholderTextColor={AppColors.placeholder}
                value={from}
                onChangeText={setFrom}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TO</Text>
              <TextInput 
                style={styles.input}
                placeholder="CHANDIGARH"
                placeholderTextColor={AppColors.placeholder}
                value={to}
                onChangeText={setTo}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PICKUP DATE</Text>
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.pickerText}>{formatDate(date)}</Text>
                <Feather name="calendar" size={20} color={AppColors.textMuted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PICKUP TIME</Text>
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.pickerText}>{formatTime(time)}</Text>
                <Feather name="clock" size={20} color={AppColors.textMuted} />
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                />
              )}
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
    backgroundColor: AppColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  logoText: {
    ...Typography.screenTitle,
  },
  mapBackground: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  watermarkImage: {
    width: '120%',
    height: '120%',
    opacity: 0.05,
    backgroundColor: AppColors.brand,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
  },
  input: {
    ...CommonStyles.input,
  },
  pickerButton: {
    ...CommonStyles.input,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    ...Typography.body,
    fontWeight: '500',
  },
  bookButton: {
    ...CommonStyles.accentButton,
    marginTop: Spacing.lg,
  },
  bookButtonText: {
    ...Typography.buttonText,
    color: AppColors.brand,
  },
});
