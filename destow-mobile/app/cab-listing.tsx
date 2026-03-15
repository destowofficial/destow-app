import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Radii, Shadows, Typography, CommonStyles } from '../constants/design-tokens';

export default function CabListingScreen() {
  const handleBack = () => {
    router.back();
  };

  const handleBook = () => {
    // Show booking confirmation
    console.log('Book clicked');
    // For Phase 1, we can just alert
    // Alert.alert("Booking Successful", "Your ride has been requested.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Feather name="corner-up-left" size={28} color={AppColors.brand} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NEW DELHI - CHANDIGARH</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.detailsBlock}>
          <View style={styles.detailsTextCol}>
            <Text style={styles.detailsTitle}>NEW DELHI - CHANDIGARH</Text>
            <Text style={styles.detailsSub}>PICK UP DETAILS : 7-3-2026 7am</Text>
          </View>
          <TouchableOpacity style={styles.modifyButton}>
            <Text style={styles.modifyButtonText}>MODIFY BOOKING</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.agencyName}>KUTRA TRAVELS</Text>
          
          <View style={styles.cardContent}>
            <View style={styles.infoCol}>
              <Text style={styles.carType}>SEDAN</Text>
              <Text style={styles.carDesc}>4 Seater A/C Cab</Text>
              
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="account-tie-hat" size={20} color={AppColors.brand} />
                <Text style={styles.featureText}>DRIVER INCLUDED</Text>
              </View>
              
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="speedometer" size={20} color={AppColors.brand} />
                <Text style={styles.featureText}>13Rs/KM</Text>
              </View>
            </View>
            
            <View style={styles.imageCol}>
              {/* Fallback to emoji if no real remote image available */}
              <Text style={{fontSize: 80}}>🚘</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
            <Text style={styles.bookButtonText}>BOOK</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.agencyName}>KUMMI TRAVELS</Text>
          
          <View style={styles.cardContent}>
            <View style={styles.infoCol}>
              <Text style={styles.carType}>SUV</Text>
              <Text style={styles.carDesc}>7 Seater A/C Cab</Text>
              
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="account-tie-hat" size={20} color={AppColors.brand} />
                <Text style={styles.featureText}>DRIVER INCLUDED</Text>
              </View>
              
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="speedometer" size={20} color={AppColors.brand} />
                <Text style={styles.featureText}>20Rs/KM</Text>
              </View>
            </View>
            
            <View style={styles.imageCol}>
              <Text style={{fontSize: 80}}>🚙</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
            <Text style={styles.bookButtonText}>BOOK</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerTitle: {
    ...Typography.sectionHeading,
  },
  scrollContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  detailsBlock: {
    backgroundColor: AppColors.cardBgLight,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  detailsTextCol: {
    flex: 1,
  },
  detailsTitle: {
    ...Typography.body,
    fontWeight: '900',
    marginBottom: Spacing.xs,
  },
  detailsSub: {
    ...Typography.caption,
    fontWeight: '600',
    color: AppColors.brand,
  },
  modifyButton: {
    backgroundColor: AppColors.accentButton,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.chip,
    marginLeft: Spacing.sm,
    ...Shadows.subtle,
  },
  modifyButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: AppColors.brand,
  },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  agencyName: {
    ...Typography.sectionHeading,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  infoCol: {
    flex: 1,
  },
  carType: {
    ...Typography.sectionHeading,
  },
  carDesc: {
    ...Typography.body,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featureText: {
    marginLeft: Spacing.sm,
    ...Typography.caption,
    fontWeight: '600',
    color: AppColors.brand,
  },
  imageCol: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  bookButton: {
    backgroundColor: '#86AABF',
    borderRadius: Radii.button,
    paddingVertical: Spacing.sm + 4,
    alignItems: 'center',
    alignSelf: 'center',
    width: '60%',
    ...Shadows.button,
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: AppColors.brand,
  },
});
