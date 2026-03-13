import { View, Text, StyleSheet } from 'react-native';

export default function TripsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your Trips</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
