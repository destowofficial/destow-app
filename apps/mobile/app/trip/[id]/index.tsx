import React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { CustomerBooking } from '@destow/contracts';
import {
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  Footer,
  H3,
  Header,
  Hero,
  Label,
  Loading,
  Row,
  Screen,
  Small,
} from '../../../components/ui/kit';
import { Icon } from '../../../components/ui/Icon';
import { color, weight } from '../../../theme/tokens';
import { f, s } from '../../../theme/responsive';
import { getBooking } from '../../../services/destow';
import { useAsync } from '../../../hooks/useAsync';
import { dayDate, time, km, tripDates } from '../../../lib/format';

// The screen a customer opens over and over between booking and pickup. It is
// the whole answer to "is this actually happening?".
export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useAsync(() => getBooking(id), [id]);

  if (trip.loading && !trip.data) return <Screen><Loading /></Screen>;
  if (trip.error || !trip.data) {
    return (
      <Screen>
        <Header onBack={() => router.back()} />
        <ErrorState message={trip.error ?? 'Trip not found'} onRetry={trip.reload} />
      </Screen>
    );
  }

  const b = trip.data;
  const owed = b.status === 'completed' && b.paymentStatus !== 'paid';
  // Once the vehicle is on the road with them in it, cancelling is a refund
  // conversation. The API refuses it, so the button should not tease it.
  const cancellable = ['pending', 'confirmed', 'assigned'].includes(b.status);
  const rateable = b.status === 'completed' && b.paymentStatus === 'paid';

  return (
    <Screen>
      <Hero>
        <Header title={`${b.from} ⇄ ${b.to}`} onBack={() => router.back()} onTint />
        <Row>
          <View>
            <Text style={styles.heroLabel}>{owed ? 'Amount due' : 'Departs'}</Text>
            <Text style={styles.heroValue}>
              {owed ? b.totalFareDisplay : dayDate(b.pickupDatetime)}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {tripDates(b.pickupDatetime, b.returnDatetime)}
            </Text>
          </View>
        </Row>
      </Hero>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={trip.loading} onRefresh={trip.reload} tintColor={color.blue} />
        }
      >
        {b.driverName ? (
          <Card lift>
            <Row>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(b.driverName)}</Text>
              </View>
              <View style={styles.driverText}>
                <Text style={styles.driverName}>{b.driverName}</Text>
                <Small>
                  {b.modelName ?? b.vehicleTypeName}
                  {b.registrationNo ? ` · ${b.registrationNo}` : ''}
                </Small>
              </View>
              {b.driverPhone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${b.driverPhone}`)}
                  style={styles.call}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${b.driverName}`}
                >
                  <Icon name="phone" size={18} color={color.ok} />
                </Pressable>
              ) : null}
            </Row>
          </Card>
        ) : null}

        <Card>
          <Label>Trip status</Label>
          <View style={styles.timeline}>
            <Step done label="Booked" when={b.createdAt} />
            <Step
              done={b.status !== 'pending'}
              label="Operator accepted"
              when={b.status !== 'pending' ? b.createdAt : null}
            />
            <Step
              done={!!b.driverName}
              now={!!b.driverName && b.status === 'assigned'}
              label="Driver assigned"
              when={b.driverName ? b.createdAt : null}
              pending="Usually 24–48 hours before pickup"
            />
            <Step
              done={['ongoing', 'completed'].includes(b.status)}
              label="Depart"
              when={b.pickupDatetime}
            />
            <Step
              last
              done={b.status === 'completed'}
              label="Back"
              when={b.returnDatetime}
            />
          </View>
        </Card>

        {b.actualDistanceM ? (
          <Card>
            <Label>Odometer</Label>
            <Row style={styles.line}>
              <Small>Reading</Small>
              <Text style={styles.value}>
                {b.odometerStartKm?.toLocaleString('en-IN')} →{' '}
                {b.odometerEndKm?.toLocaleString('en-IN')}
              </Text>
            </Row>
            <Row style={styles.line}>
              <Small>Distance run</Small>
              <Text style={styles.value}>{km(b.actualDistanceM)}</Text>
            </Row>
            <Divider style={{ marginVertical: s(10) }} />
            <Row>
              <H3>{b.paymentStatus === 'paid' ? 'Paid' : 'To pay'}</H3>
              <Text style={styles.total}>{b.totalFareDisplay}</Text>
            </Row>
          </Card>
        ) : null}

        {b.status === 'cancelled' ? (
          <Card tone="red">
            <Row>
              <Small style={{ color: color.red }}>Cancelled</Small>
              <Text style={styles.cancelFee}>
                {b.cancellationFeePaise ? `${b.totalFareDisplay} fee` : 'No charge'}
              </Text>
            </Row>
          </Card>
        ) : null}
      </ScrollView>

      <Footer>
        {owed ? (
          <Button
            label={`Pay ${b.totalFareDisplay}`}
            onPress={() => router.push({ pathname: '/trip/[id]/pay', params: { id: b.id } })}
          />
        ) : rateable ? (
          <Button
            label="Rate this trip"
            onPress={() => router.push({ pathname: '/trip/[id]/rate', params: { id: b.id } })}
          />
        ) : cancellable ? (
          <Button
            label="Cancel trip"
            variant="ghost"
            onPress={() => router.push({ pathname: '/trip/[id]/cancel', params: { id: b.id } })}
          />
        ) : null}
      </Footer>
    </Screen>
  );
}

function Step({
  label,
  when,
  done,
  now,
  last,
  pending,
}: {
  label: string;
  when?: string | null;
  done?: boolean;
  now?: boolean;
  last?: boolean;
  pending?: string;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View style={[styles.dot, done && styles.dotDone, now && styles.dotNow]} />
        {!last ? <View style={[styles.stepLine, done && styles.stepLineDone]} /> : null}
      </View>
      <View style={styles.stepText}>
        <Text style={[styles.stepLabel, !done && styles.stepLabelOff, now && styles.stepLabelNow]}>
          {label}
        </Text>
        <Small>{when ? `${dayDate(when)}, ${time(when)}` : (pending ?? '')}</Small>
      </View>
    </View>
  );
}

function initials(name?: string | null): string {
  if (!name) return '·';
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const styles = StyleSheet.create({
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: f(12) },
  heroValue: {
    color: color.white,
    fontSize: f(22),
    fontWeight: weight.black,
    letterSpacing: -0.7,
    fontVariant: ['tabular-nums'],
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    borderRadius: 999,
  },
  heroBadgeText: { color: color.white, fontSize: f(11), fontWeight: weight.bold },

  scroll: { flex: 1, marginTop: -s(16) },
  body: { paddingHorizontal: s(18), paddingBottom: s(24), gap: s(12) },

  avatar: {
    width: s(42),
    height: s(42),
    borderRadius: 999,
    backgroundColor: color.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: color.white, fontSize: f(15), fontWeight: weight.bold },
  driverText: { flex: 1 },
  driverName: { fontSize: f(14.5), fontWeight: weight.bold, color: color.ink },
  call: {
    width: s(40),
    height: s(40),
    borderRadius: 999,
    backgroundColor: color.okWash,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeline: { marginTop: s(12) },
  step: { flexDirection: 'row', gap: s(12) },
  stepRail: { alignItems: 'center', width: s(14) },
  dot: {
    width: s(11),
    height: s(11),
    borderRadius: 999,
    backgroundColor: color.card,
    borderWidth: 2,
    borderColor: color.line,
    marginTop: s(3),
  },
  dotDone: { backgroundColor: color.ok, borderColor: color.ok },
  dotNow: { backgroundColor: color.blue, borderColor: color.blueBorder, borderWidth: 4 },
  stepLine: { width: 2, flex: 1, backgroundColor: color.line, minHeight: s(22), borderRadius: 2 },
  stepLineDone: { backgroundColor: color.ok },
  stepText: { flex: 1, paddingBottom: s(16) },
  stepLabel: { fontSize: f(13.5), fontWeight: weight.semi, color: color.ink },
  stepLabelOff: { color: color.dim },
  stepLabelNow: { color: color.blue },

  line: { marginTop: s(8) },
  value: { fontSize: f(13), fontWeight: weight.semi, color: color.ink, fontVariant: ['tabular-nums'] },
  total: {
    fontSize: f(20),
    fontWeight: weight.black,
    color: color.ink,
    letterSpacing: -0.7,
    fontVariant: ['tabular-nums'],
  },
  cancelFee: { fontSize: f(14), fontWeight: weight.bold, color: color.red },
});
