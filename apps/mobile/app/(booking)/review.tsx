import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Divider,
  Footer,
  Header,
  Label,
  Row,
  Screen,
  Small,
} from '../../components/ui/kit';
import { Icon } from '../../components/ui/Icon';
import { color, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { createBooking } from '../../services/destow';
import { messageFor } from '../../hooks/useAsync';
import { dayDate, time, km } from '../../lib/format';
import { provisionalReturn } from '../../lib/trip';
import { useBookingStore } from '../../stores/useBookingStore';

// The last look before the vehicle is held.
//
// The figure shown is an estimate and says so. What the customer actually pays
// is settled when the driver closes the trip with an odometer reading, so
// calling this "total" would be a promise the model does not make.
export default function Review() {
  const draft = useBookingStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { vehicle, route, from, to, pickup } = draft;

  // The customer never gives a return date, so the vehicle's hold window is
  // estimated from the route's own driving time. It is a hold, not a promise:
  // the trip ends when the driver files the odometer.
  const returnAt = pickup && route ? provisionalReturn(pickup, route.durationS) : null;

  // Reached only through the vehicle list, but a deep link or a restored
  // navigation state could land here without one.
  if (!vehicle || !route || !pickup || !returnAt) {
    return (
      <Screen>
        <Header title="Review" onBack={() => router.back()} />
        <View style={styles.gone}>
          <Small>That selection has expired. Start the search again.</Small>
          <Button
            label="Back to search"
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
            style={{ marginTop: s(16) }}
          />
        </View>
      </Screen>
    );
  }

  async function book() {
    setBusy(true);
    setError(null);
    try {
      // Note what is absent: no price. The server routes the distance and
      // computes the fare itself, so there is no number here that reaches money.
      const booking = await createBooking({
        vehicleId: vehicle!.vehicleId,
        from,
        to,
        pickupDatetime: pickup!,
        returnDatetime: returnAt!,
      });
      draft.reset();
      router.replace({ pathname: '/(booking)/confirmed', params: { id: booking.id } });
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header title="Review" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.legs}>
            <View style={styles.rail}>
              <Icon name="dot" size={14} color={color.ok} />
              <View style={styles.railLine} />
              <Icon name="pin" size={14} color={color.red} />
            </View>
            <View style={styles.legText}>
              <View>
                <Label>Pickup</Label>
                <Text style={styles.place}>{from}</Text>
              </View>
              <View>
                <Label>Drop</Label>
                <Text style={styles.place}>{to}</Text>
              </View>
            </View>
          </View>

          <Divider style={{ marginVertical: s(12) }} />

          <Row style={styles.line}>
            <Small>Departs</Small>
            <Text style={styles.lineValue}>
              {dayDate(pickup)}, {time(pickup)}
            </Text>
          </Row>
          <Row style={styles.line}>
            <Small>Back by</Small>
            <Text style={styles.lineValue}>{dayDate(returnAt)}</Text>
          </Row>
          <Row style={styles.line}>
            <Small>Vehicle</Small>
            <Text style={styles.lineValue}>{vehicle.vehicleTypeName}</Text>
          </Row>
          <Row>
            <Small>Operator</Small>
            <Text style={styles.lineValue}>{vehicle.providerName}</Text>
          </Row>
        </Card>

        <Card style={styles.estimate}>
          <Row>
            <View style={styles.estimateText}>
              <Text style={styles.estimateLabel}>Estimated total</Text>
              <Text style={styles.estimateNote}>
                {km(route.distanceM * 2)} both ways · {vehicle.pricePerKmPaise / 100}/km
              </Text>
            </View>
            <Text style={styles.estimateAmount}>{vehicle.totalFareDisplay}</Text>
          </Row>
        </Card>

        <Card tone="blue" style={styles.note}>
          <Row style={styles.noteRow}>
            <Icon name="info" size={17} color={color.blueDark} />
            <Text style={styles.noteText}>
              An estimate, not the bill. Your driver reads the odometer at the end and you pay for
              the kilometres actually run.
            </Text>
          </Row>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <Footer>
        <Button label="Confirm booking" onPress={book} loading={busy} />
        <View style={styles.reassure}>
          <Icon name="tickCircle" size={13} color={color.dim} />
          <Small> Nothing is charged now</Small>
        </View>
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: s(18), paddingBottom: s(24), gap: s(12) },
  gone: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: s(24) },

  legs: { flexDirection: 'row', gap: s(12) },
  rail: { alignItems: 'center', paddingTop: s(3) },
  railLine: { width: 2, flex: 1, backgroundColor: color.line, marginVertical: s(4), minHeight: s(20) },
  legText: { flex: 1, gap: s(16) },
  place: { fontSize: f(14), fontWeight: weight.semi, color: color.ink },

  line: { marginBottom: s(8) },
  lineValue: { fontSize: f(13.5), fontWeight: weight.semi, color: color.ink },

  estimate: { backgroundColor: color.blue },
  estimateText: { flex: 1 },
  estimateLabel: {
    fontSize: f(11),
    fontWeight: weight.bold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
  },
  estimateNote: { fontSize: f(12), color: 'rgba(255,255,255,0.85)', marginTop: s(2) },
  estimateAmount: {
    fontSize: f(26),
    fontWeight: weight.black,
    color: color.white,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },

  note: { padding: s(13) },
  noteRow: { justifyContent: 'flex-start', gap: s(10), alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: f(12.5), color: color.blueDark, lineHeight: f(18) },
  error: { fontSize: f(13), color: color.red, lineHeight: f(19) },
  reassure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: s(12) },
});
