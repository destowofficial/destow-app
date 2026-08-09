import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  Footer,
  H1,
  Loading,
  P,
  Row,
  Screen,
  Small,
} from '../../components/ui/kit';
import { color, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { getBooking } from '../../services/destow';
import { useAsync } from '../../hooks/useAsync';
import { tripDates } from '../../lib/format';

// Booked, and nothing taken.
//
// The line that matters here is "₹0 charged today". A customer who has just
// committed to a five-figure trip needs to know immediately that no money has
// moved, or they will go looking for the charge.
export default function Confirmed() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useAsync(() => getBooking(id), [id]);

  if (booking.loading) return <Screen><Loading /></Screen>;
  if (booking.error || !booking.data) {
    return (
      <Screen>
        <ErrorState message={booking.error ?? 'Booking not found'} onRetry={booking.reload} />
      </Screen>
    );
  }

  const b = booking.data;

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.tick}>
          <Ionicons name="checkmark" size={f(40)} color={color.ok} />
        </View>

        <View style={styles.headline}>
          <H1 style={styles.centre}>Booking confirmed</H1>
          <P style={styles.centre}>
            {b.providerName} has your trip.{'\n'}
            {tripDates(b.pickupDatetime, b.returnDatetime)}.
          </P>
        </View>

        <Card style={styles.detail}>
          <Row style={styles.line}>
            <Small>Trip</Small>
            <Text style={styles.value}>
              {b.from} ⇄ {b.to}
            </Text>
          </Row>
          <Row style={styles.line}>
            <Small>Estimated fare</Small>
            <Text style={styles.amount}>{b.estimatedFareDisplay}</Text>
          </Row>
          <Row style={styles.line}>
            <Small>Charged today</Small>
            <Text style={[styles.amount, { color: color.ok }]}>₹0</Text>
          </Row>
          <Divider style={{ marginVertical: s(10) }} />
          <Row>
            <Small>Status</Small>
            <Badge label="Awaiting driver" tone="warn" />
          </Row>
        </Card>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={f(16)} color={color.dim} />
          <Small style={styles.noteText}>
            When you get back, your driver submits the odometer reading. You pay for the kilometres
            actually run, by UPI or cash.
          </Small>
        </View>
      </View>

      <Footer>
        <Button
          label="View trip"
          onPress={() => router.replace({ pathname: '/trip/[id]', params: { id: b.id } })}
        />
        <Button
          label="Done"
          variant="ghost"
          onPress={() => router.replace('/(tabs)')}
          style={{ marginTop: s(9) }}
        />
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(18),
    gap: s(19),
  },
  tick: {
    width: s(80),
    height: s(80),
    borderRadius: 999,
    backgroundColor: color.okWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { gap: s(7) },
  centre: { textAlign: 'center' },
  detail: { width: '100%' },
  line: { marginBottom: s(10) },
  value: { fontSize: f(13), fontWeight: weight.semi, color: color.ink },
  amount: {
    fontSize: f(15),
    fontWeight: weight.bold,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  note: { flexDirection: 'row', gap: s(9), alignItems: 'flex-start' },
  noteText: { flex: 1 },
});
