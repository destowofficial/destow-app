import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Radii, Shadows, Typography, CommonStyles } from '../../constants/design-tokens';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  
  // Date/Time state
  const [date, setDate] = useState(new Date(2026, 2, 16)); // Default 16/03/2026 for demo based on image
  const [time, setTime] = useState(new Date(new Date().setHours(10, 0, 0, 0))); // Default 10:00 for demo
  
  // Picker visibility state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleBook = () => {
    router.push('/cab-listing');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) setTime(selectedTime);
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
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
        
        {/* Header Hero Section */}
        <View style={styles.heroSection}>
          <Image 
             source={require('../../assets/images/wallpaper.jpg')}
            style={styles.heroImage} 
            resizeMode="cover" 
          />
          <View style={styles.heroOverlay}>
            <SafeAreaView edges={['top']}>
              <View style={styles.headerContent}>
                <View>
                  <Text style={styles.greetingLight}>Hello,</Text>
                  <Text style={styles.greetingBold}>Rahul</Text>
                </View>
                {/* Placeholder for Profile Avatar */}
                <View style={styles.avatarPlaceholder} />
              </View>
            </SafeAreaView>
          </View>
        </View>

        {/* Floating Search Card */}
        <View style={styles.searchCardWrapper}>
          <View style={styles.searchCard}>
            
            {/* Route Timeline */}
            <View style={styles.routeContainer}>
              <View style={styles.timelineColumn}>
                <View style={[styles.dot, {backgroundColor: AppColors.brand}]} />
                <View style={styles.line} />
                <View style={styles.swapIconContainer}>
                  <Feather name="repeat" size={14} color={AppColors.brand} />
                </View>
                <View style={styles.line} />
                <View style={[styles.dot, {backgroundColor: AppColors.error}]} />
              </View>
              
              <View style={styles.locationsColumn}>
                <View style={styles.locationInput}>
                  <Text style={styles.locationLabel}>LEAVING FROM</Text>
                  <View style={styles.locationRow}>
                    <Feather name="map-pin" size={18} color={AppColors.brand} style={styles.locationIcon} />
                    <TextInput 
                      style={styles.locationInputText}
                      placeholder="Delhi"
                      placeholderTextColor={AppColors.brand}
                      value={from}
                      onChangeText={setFrom}
                      selectionColor={AppColors.brand}
                    />
                  </View>
                </View>

                <View style={styles.locationDivider} />

                <View style={styles.locationInput}>
                  <Text style={styles.locationLabel}>GOING TO</Text>
                  <View style={styles.locationRow}>
                    <Feather name="map-pin" size={18} color={AppColors.error} style={styles.locationIcon} />
                    <TextInput 
                      style={styles.locationInputText}
                      placeholder="Jaipur"
                      placeholderTextColor={AppColors.brand}
                      value={to}
                      onChangeText={setTo}
                      selectionColor={AppColors.brand}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Date and Time Pickers */}
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeBlock}>
                <Text style={styles.dateTimeLabel}>PICKUP DATE</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                  <Feather name="calendar" size={18} color={AppColors.brand} />
                  <Text style={styles.pickerText}>{formatDate(date)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateTimeBlock}>
                <Text style={styles.dateTimeLabel}>PICKUP TIME</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
                  <Feather name="clock" size={18} color={AppColors.brand} />
                  <Text style={styles.pickerText}>{formatTime(time)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />
            )}
            {showTimePicker && (
              <DateTimePicker value={time} mode="time" display="default" onChange={onTimeChange} />
            )}

            <TouchableOpacity style={styles.searchButton} onPress={handleBook}>
              <Text style={styles.searchButtonText}>Search Cabs</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why choose Destow?</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuresScroll}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconOuter}>
                <View style={styles.featureIconInner}>
                  <MaterialCommunityIcons name="shield-check-outline" size={24} color={AppColors.brand} />
                </View>
              </View>
              <Text style={styles.featureText}>Verified Drivers</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconOuter}>
                <View style={[styles.featureIconInner, {backgroundColor: AppColors.background}]}>
                  <Feather name="search" size={24} color={AppColors.brand} />
                </View>
              </View>
              <Text style={styles.featureText}>Transparent{'\n'}Pricing</Text>
            </View>
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: Spacing.xl * 2,
  },
  heroSection: {
    height: 320, // Taller size to match image layout
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', // Slight dark overlay
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  greetingLight: {
    fontSize: 24,
    color: AppColors.background,
    fontWeight: '400',
  },
  greetingBold: {
    fontSize: 32,
    color: AppColors.background,
    fontWeight: '800',
    marginTop: -4,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  searchCardWrapper: {
    marginTop: -100, // Pull card up into hero section
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  searchCard: {
    backgroundColor: AppColors.background,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  timelineColumn: {
    width: 30,
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.accent,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: AppColors.border,
    marginVertical: 4,
    borderStyle: 'dashed', // Note: React Native dashed borders can be tricky without direct SVG, will use solid light grey if unsupported
  },
  swapIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  locationsColumn: {
    flex: 1,
  },
  locationInput: {
    marginVertical: Spacing.sm,
  },
  locationLabel: {
    ...Typography.label,
    marginBottom: 4,
    color: AppColors.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: Spacing.sm,
  },
  locationInputText: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.brand,
    paddingVertical: Spacing.xs,
    flex: 1,
  },
  locationDivider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: Spacing.md,
    marginLeft: 30, // aligning with text roughly
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  dateTimeBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  dateTimeLabel: {
    ...Typography.label,
    marginBottom: Spacing.sm,
    fontSize: 10,
    letterSpacing: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.cardBgLight,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radii.input,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.brand,
    marginLeft: Spacing.sm,
  },
  searchButton: {
    ...CommonStyles.primaryButton,
    width: '100%',
    borderRadius: Radii.input,
  },
  searchButtonText: {
    ...Typography.buttonText,
    color: AppColors.background,
    fontSize: 18,
  },
  featuresSection: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.sectionHeading,
    marginBottom: Spacing.lg,
  },
  featuresScroll: {
    paddingBottom: Spacing.lg,
  },
  featureCard: {
    backgroundColor: AppColors.cardBgLight,
    width: 140,
    height: 150,
    borderRadius: Radii.card,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  featureIconOuter: {
    backgroundColor: AppColors.accent,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  featureIconInner: {
    backgroundColor: AppColors.background,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.brand,
    textAlign: 'center',
  },
});
