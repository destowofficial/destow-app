import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { CustomerBooking } from '@destow/contracts';
import {
  Badge,
  Button,
  Card,
  Chips,
  Empty,
  ErrorState,
  H1,
  Loading,
  Row,
  Screen,
  Small,
} from '../../components/ui/kit';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { color, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { listMyBookings } from '../../services/destow';
import { useAsync } from '../../hooks/useAsync';
import { rupees, km, tripDates } from '../../lib/format';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

// Four states a trip can be in, and one of them needs the customer to act. A
// finished trip that has not been paid for is the row that has to stand out,
// which is why it carries a button rather than only a badge.
export default function Trips() {
  const [filter, setFilter] = useState('all');

  const page = useAsync(
    () =>
      listMyBookings({
        limit: 30,
        ...(filter === 'completed' ? { status: 'completed' } : {}),
      }),
    [filter],
  );

  const items = (page.data?.items ?? []).filter((b) =>
    filter === 'upcoming' ? ['pending', 'confirmed', 'assigned', 'ongoing'].includes(b.status) : true,
  );

  return (
    <Screen>
      <View style={styles.head}>
        <H1>Your trips</H1>
      </View>
      <View style={styles.filters}>
        <Chips options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {page.loading && !page.data ? (
        <ListSkeleton rows={4} tall />
      ) : page.error ? (
        <ErrorState message={page.error} onRetry={page.reload} />
      ) : items.length === 0 ? (
        <Empty
          title="No trips yet"
          body="Your outstation trips will show up here once you book one."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={page.loading} onRefresh={page.reload} tintColor={color.blue} />
          }
        >
          {items.map((b) => (
            <TripRow key={b.id} booking={b} />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function TripRow({ booking: b }: { booking: CustomerBooking }) {
  const owed = b.status === 'completed' && b.paymentStatus !== 'paid';
  const open = () => router.push({ pathname: '/trip/[id]', params: { id: b.id } });

  return (
    <Card onPress={open} style={owed ? styles.owed : undefined}>
      <Row style={styles.rowHead}>
        <Text style={styles.route}>
          {b.from} ⇄ {b.to}
        </Text>
        <Status booking={b} />
      </Row>

      <Row>
        <Small>
          {tripDates(b.pickupDatetime, b.returnDatetime)} · {b.vehicleTypeName}
          {b.actualDistanceM ? ` · ${km(b.actualDistanceM)} run` : ''}
        </Small>
        {b.status === 'cancelled' ? (
          <Text style={styles.fee}>
            {b.cancellationFeePaise ? `${rupees(b.cancellationFeePaise)} fee` : 'No charge'}
          </Text>
        ) : b.paymentStatus === 'paid' ? (
          <Text style={styles.amount}>{b.totalFareDisplay}</Text>
        ) : b.status === 'completed' ? (
          <Text style={styles.amount}>{b.totalFareDisplay}</Text>
        ) : (
          <Small>est. {b.estimatedFareDisplay}</Small>
        )}
      </Row>

      {owed ? (
        <Button
          label={`Pay ${b.totalFareDisplay}`}
          onPress={open}
          style={styles.payNow}
        />
      ) : null}
    </Card>
  );
}

function Status({ booking: b }: { booking: CustomerBooking }) {
  if (b.status === 'cancelled') return <Badge label="Cancelled" tone="red" />;
  if (b.status === 'completed') {
    return b.paymentStatus === 'paid' ? (
      <Badge label="Paid" tone="ok" />
    ) : (
      <Badge label="Payment due" tone="warn" />
    );
  }
  if (b.status === 'ongoing') return <Badge label="On the road" tone="ok" />;
  if (b.status === 'assigned') return <Badge label="Driver assigned" tone="ok" />;
  if (b.status === 'confirmed') return <Badge label="Confirmed" tone="blue" />;
  return <Badge label="Awaiting operator" tone="warn" />;
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: s(18), paddingTop: s(6) },
  filters: { paddingHorizontal: s(18), paddingVertical: s(14) },
  list: { paddingHorizontal: s(18), paddingBottom: s(28), gap: s(11) },
  owed: { borderWidth: 1.5, borderColor: color.warnBorder },
  rowHead: { marginBottom: s(8), alignItems: 'flex-start' },
  route: { flex: 1, fontSize: f(15), fontWeight: weight.bold, color: color.ink, letterSpacing: -0.2 },
  amount: {
    fontSize: f(15),
    fontWeight: weight.bold,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  fee: { fontSize: f(14), fontWeight: weight.bold, color: color.red, fontVariant: ['tabular-nums'] },
  payNow: { marginTop: s(11), height: s(40) },
});
