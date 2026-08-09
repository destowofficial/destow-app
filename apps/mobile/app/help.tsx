import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Header, Label, Row, Screen, Small } from '../components/ui/kit';
import { Icon } from '../components/ui/Icon';
import { color, radius, weight } from '../theme/tokens';
import { f, s } from '../theme/responsive';
import { config } from '../constants/config';

// Questions people actually ask, answered where they ask them. Scoped to a
// booking wherever it can be: "my trip" questions are unanswerable without
// knowing which trip.
const QUESTIONS = [
  {
    q: 'My driver hasn’t been assigned',
    a: 'Operators usually assign a driver 24 to 48 hours before pickup. You’ll see their name and number on the trip as soon as they do.',
  },
  {
    q: 'What does the fare include?',
    a: 'The kilometres your vehicle actually runs, both ways, at the rate you booked. Tolls, parking and the driver’s stay are settled directly with the operator.',
  },
  {
    q: 'Why is the final fare different from the estimate?',
    a: 'The estimate is the routed distance. You pay for the distance actually driven, which your driver reads off the odometer at the end — you see both before you pay.',
  },
  {
    q: 'Cancelling and refunds',
    a: 'Cancelling more than 24 hours before pickup is free. After that a fee applies, and the app shows you the exact amount before you confirm.',
  },
  {
    q: 'How do I pay?',
    a: 'When the trip is done, scan the UPI QR in the app or hand cash to your driver. Nothing is charged before then.',
  },
];

export default function Help() {
  return (
    <Screen>
      <Header title="Help" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Label>Common questions</Label>
        {QUESTIONS.map((item) => (
          <Card key={item.q}>
            <Text style={styles.q}>{item.q}</Text>
            <Small style={styles.a}>{item.a}</Small>
          </Card>
        ))}

        <Card
          style={styles.contact}
          onPress={() => Linking.openURL(`mailto:${config.supportEmail}`)}
        >
          <Row>
            <View style={styles.plate}>
              <Icon name="mail" size={18} color={color.blue} />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Still stuck?</Text>
              <Small>{config.supportEmail}</Small>
            </View>
            <Icon name="forward" size={16} color={color.dim} />
          </Row>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: s(18), paddingBottom: s(28), gap: s(10) },
  q: { fontSize: f(14), fontWeight: weight.bold, color: color.ink, marginBottom: s(5) },
  a: { lineHeight: f(18) },
  contact: { marginTop: s(6) },
  contactText: { flex: 1 },
  contactTitle: { fontSize: f(14), fontWeight: weight.bold, color: color.ink },
  plate: { width: s(36), height: s(36), borderRadius: radius.md, backgroundColor: color.blueWash, alignItems: 'center', justifyContent: 'center' },
});
