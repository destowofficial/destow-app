import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Button, Card, Divider, ErrorState, Footer, H1, H3, Loading, P, Row, Screen, Small,
} from '../../../components/ui/kit';
import { Icon } from '../../../components/ui/Icon';
import { color, weight } from '../../../theme/tokens';
import { f, s } from '../../../theme/responsive';
import { getBooking } from '../../../services/destow';
import { useAsync } from '../../../hooks/useAsync';
import { km, tripDates } from '../../../lib/format';

export default function Paid() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useAsync(() => getBooking(id), [id]);

  if (trip.loading && !trip.data) return <Screen><Loading /></Screen>;
  if (trip.error || !trip.data) {
    return <Screen><ErrorState message={trip.error ?? 'Trip not found'} onRetry={trip.reload} /></Screen>;
  }
  const b = trip.data;

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.tick}>
          <Icon name="tick" size={40} color={color.ok} />
        </View>

        <View style={styles.headline}>
          <H1 style={styles.centre}>Paid {b.totalFareDisplay}</H1>
          <P style={styles.centre}>
            {b.from} ⇄ {b.to}
            {b.actualDistanceM ? ` · ${km(b.actualDistanceM)}` : ''}{'\n'}
            with {b.providerName}
          </P>
        </View>

        <Card style={styles.receipt}>
          <Row style={styles.line}>
            <Small>Dates</Small>
            <Text style={styles.value}>{tripDates(b.pickupDatetime, b.returnDatetime)}</Text>
          </Row>
          <Row style={styles.line}>
            <Small>Paid by</Small>
            <Text style={styles.value}>{b.paymentMethod === 'cash' ? 'Cash' : 'UPI'}</Text>
          </Row>
          <Divider style={{ marginVertical: s(10) }} />
          <Row>
            <H3>Total</H3>
            <Text style={styles.total}>{b.totalFareDisplay}</Text>
          </Row>
        </Card>
      </View>

      <Footer>
        <Button
          label="Rate this trip"
          onPress={() => router.replace({ pathname: '/trip/[id]/rate', params: { id: b.id } })}
        />
        <Button label="Done" variant="ghost" onPress={() => router.replace('/(tabs)/trips')} style={{ marginTop: s(9) }} />
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: s(18), gap: s(19) },
  tick: { width: s(80), height: s(80), borderRadius: 999, backgroundColor: color.okWash, alignItems: 'center', justifyContent: 'center' },
  headline: { gap: s(7) },
  centre: { textAlign: 'center' },
  receipt: { width: '100%' },
  line: { marginBottom: s(10) },
  value: { fontSize: f(13), fontWeight: weight.semi, color: color.ink },
  total: { fontSize: f(20), fontWeight: weight.black, color: color.ink, letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
});
