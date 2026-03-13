import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

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
          <Feather name="corner-up-left" size={28} color="black" />
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
                <MaterialCommunityIcons name="account-tie-hat" size={20} color="black" />
                <Text style={styles.featureText}>DRIVER INCLUDED</Text>
              </View>
              
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="speedometer" size={20} color="black" />
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
                <MaterialCommunityIcons name="account-tie-hat" size={20} color="black" />
                <Text style={styles.featureText}>DRIVER INCLUDED</Text>
              </View>
              
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="speedometer" size={20} color="black" />
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  scrollContainer: {
    padding: 15,
    paddingBottom: 40,
  },
  detailsBlock: {
    backgroundColor: '#D1E8F5',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsTextCol: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    marginBottom: 4,
  },
  detailsSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  modifyButton: {
    backgroundColor: '#B1CCDB',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginLeft: 10,
  },
  modifyButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  card: {
    backgroundColor: '#A0D2E7',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  agencyName: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    marginBottom: 15,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoCol: {
    flex: 1,
  },
  carType: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  carDesc: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  imageCol: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  bookButton: {
    backgroundColor: '#86AABF',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    alignSelf: 'center',
    width: '60%',
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
});
