import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Card,
  Divider,
  ErrorState,
  H3,
  PageHead,
  Label,
  Loading,
  Row,
  Screen,
  Small,
} from '../../../components/ui/kit';
import { Icon } from '../../../components/ui/Icon';
import { color, radius, weight } from '../../../theme/tokens';
import { f, s } from '../../../theme/responsive';
import { getBooking } from '../../../services/destow';
import { useAsync } from '../../../hooks/useAsync';
import { km, tripDates } from '../../../lib/format';

// What the trip cost, then how to settle it.
//
// The odometer readings sit above the total on purpose: this is the moment the
// customer agrees the distance, and paying is that agreement. Nobody should be
// asked for a figure without seeing where it came from.
export default function Pay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useAsync(() => getBooking(id), [id]);

  if (trip.loading && !trip.data) return <Screen><Loading /></Screen>;
  if (trip.error || !trip.data) {
    return (
      <Screen>
        <PageHead title="Pay" onBack={() => router.back()} />
        <ErrorState message={trip.error ?? 'Trip not found'} onRetry={trip.reload} />
      </Screen>
    );
  }

  const b = trip.data;
  const over = b.totalFarePaise - b.estimatedFarePaise;

  return (
    <Screen ground={color.blue}>
      <PageHead
        title="Pay for your trip"
        subtitle={`${b.from} → ${b.to}`}
        onBack={() => router.back()}
      />

      <View style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card lift>
          <Label>{tripDates(b.pickupDatetime, b.returnDatetime)}</Label>

          {b.odometerStartKm != null ? (
            <Row style={styles.line}>
              <Small>Odometer</Small>
              <Text style={styles.value}>
                {b.odometerStartKm.toLocaleString('en-IN')} →{' '}
                {b.odometerEndKm?.toLocaleString('en-IN')}
              </Text>
            </Row>
          ) : null}

          {b.actualDistanceM ? (
            <Row style={styles.line}>
              <Small>
                {km(b.actualDistanceM)} × ₹{(b.pricePerKmPaise / 100).toFixed(0)}/km
              </Small>
              <Text style={styles.value}>{b.totalFareDisplay}</Text>
            </Row>
          ) : null}

          <Divider style={{ marginVertical: s(11) }} />
          <Row>
            <H3>Total</H3>
            <Text style={styles.total}>{b.totalFareDisplay}</Text>
          </Row>

          {over !== 0 ? (
            <Small style={styles.delta}>
              {over > 0 ? 'Above' : 'Below'} the {b.estimatedFareDisplay} estimate — you pay for the
              distance actually run.
            </Small>
          ) : null}
        </Card>

        <Label style={styles.choose}>How would you like to pay?</Label>

        <Card
          onPress={() => router.push({ pathname: '/trip/[id]/qr', params: { id: b.id } })}
          style={styles.method}
        >
          <Row>
            <View style={styles.plate}>
              <Text style={styles.plateGlyph}>₹</Text>
            </View>
            <View style={styles.methodText}>
              <Text style={styles.methodName}>UPI</Text>
              <Small>Scan a QR with any UPI app</Small>
            </View>
            <Icon name="forward" size={17} color={color.dim} />
          </Row>
        </Card>

        <Card style={styles.method}>
          <Row>
            <View style={[styles.plate, { backgroundColor: color.okWash }]}>
              <Icon name="wallet" size={19} color={color.ok} />
            </View>
            <View style={styles.methodText}>
              <Text style={styles.methodName}>Cash</Text>
              <Small>
                Hand it to {b.driverName?.split(' ')[0] ?? 'your driver'} — they confirm it on their
                phone
              </Small>
            </View>
          </Row>
        </Card>

        <Small style={styles.footnote}>
          Paying is how you agree the distance. Nothing is charged until you do.
        </Small>
      </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: s(18), paddingTop: s(14), paddingBottom: s(28), gap: s(11) },
  line: { marginTop: s(9) },
  value: { fontSize: f(13), fontWeight: weight.semi, color: color.ink, fontVariant: ['tabular-nums'] },
  total: {
    fontSize: f(25),
    fontWeight: weight.black,
    color: color.ink,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  delta: { marginTop: s(9) },
  choose: { marginTop: s(10) },
  method: { padding: s(14) },
  methodText: { flex: 1 },
  methodName: { fontSize: f(14.5), fontWeight: weight.bold, color: color.ink },
  plate: {
    width: s(36),
    height: s(36),
    borderRadius: radius.md,
    backgroundColor: color.blueWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateGlyph: { fontSize: f(17), fontWeight: weight.black, color: color.blue },
  footnote: { textAlign: 'center', marginTop: s(8), paddingHorizontal: s(16) },
});
