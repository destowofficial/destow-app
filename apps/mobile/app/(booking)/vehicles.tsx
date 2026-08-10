import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { VehicleCategory } from '@destow/contracts';
import {
  Card,
  Chips,
  Empty,
  ErrorState,
  Header,
  Loading,
  Row,
  Screen,
  Small,
} from '../../components/ui/kit';
import { Icon } from '../../components/ui/Icon';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { color, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { listAvailableVehicles } from '../../services/destow';
import { useAsync } from '../../hooks/useAsync';
import { rupees, km } from '../../lib/format';
import { useBookingStore } from '../../stores/useBookingStore';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'car', label: 'Car' },
  { key: 'suv', label: 'SUV' },
  { key: 'bus', label: 'Bus' },
];

// The catalogue, priced. Every row carries the total for the whole round trip
// rather than only the per-kilometre rate: the rate on its own is a number
// nobody can act on, and it is the total that decides which car someone picks.
export default function Vehicles() {
  const { from, to, setVehicle } = useBookingStore();
  const [filter, setFilter] = useState('all');

  const listing = useAsync(
    () =>
      listAvailableVehicles({
        from,
        to,
        ...(filter === 'all' ? {} : { category: filter as VehicleCategory }),
      }),
    [from, to, filter],
  );

  const route = listing.data?.route;

  return (
    <Screen>
      <Header
        title={listing.data ? `${listing.data.totalAvailable} vehicles` : 'Vehicles'}
        onBack={() => router.back()}
      />

      <View style={styles.sub}>
        <Small>
          {from} ⇄ {to}
          {route ? ` · est. ${km(route.distanceM * 2)}` : ''}
        </Small>
      </View>

      <View style={styles.filters}>
        <Chips options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {listing.loading ? (
        <ListSkeleton rows={4} />
      ) : listing.error ? (
        <ErrorState message={listing.error} onRetry={listing.reload} />
      ) : (listing.data?.vehicles.length ?? 0) === 0 ? (
        <Empty
          title="Nothing on this route yet"
          body="No operator is serving these dates. Try a different date or a nearby city."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {listing.data!.vehicles.map((v) => (
            <Card
              key={v.vehicleId}
              onPress={() => {
                setVehicle(v, listing.data!.route);
                router.push('/(booking)/review');
              }}
            >
              <Row style={styles.head}>
                <View style={styles.headText}>
                  <Text style={styles.name}>{v.vehicleTypeName}</Text>
                  {v.modelName ? <Small>{v.modelName}</Small> : null}
                </View>
                <View style={styles.seats}>
                  <Icon name="user" size={12} color={color.blueDark} />
                  <Text style={styles.seatsText}>{v.seats}</Text>
                </View>
              </Row>

              <Row>
                <View style={styles.meta}>
                  <View style={styles.rating}>
                    <Icon name="star" size={12} color={v.providerRatingAvg ? color.star : color.dim} />
                    <Text style={styles.ratingText}>
                      {v.providerRatingAvg ? v.providerRatingAvg.toFixed(1) : 'New'}
                    </Text>
                    <Small> · {v.providerName}</Small>
                  </View>
                  <Small>
                    {rupees(v.pricePerKmPaise)}/km
                    {route ? ` · est. ${km(route.distanceM * 2)}` : ''}
                  </Small>
                </View>
                <Text style={styles.fare}>{v.totalFareDisplay}</Text>
              </Row>
            </Card>
          ))}

          {listing.data!.truncated ? (
            <Small style={styles.truncated}>
              Showing the {listing.data!.vehicles.length} cheapest of {listing.data!.totalAvailable}.
            </Small>
          ) : null}

          <Small style={styles.footnote}>
            Prices are an estimate for the round trip. You pay for the kilometres actually driven.
          </Small>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { paddingHorizontal: s(18), marginTop: -s(8) },
  filters: { paddingHorizontal: s(18), paddingVertical: s(13) },
  list: { paddingHorizontal: s(18), paddingBottom: s(28), gap: s(11) },
  head: { marginBottom: s(9), alignItems: 'flex-start' },
  headText: { flex: 1 },
  name: { fontSize: f(15), fontWeight: weight.bold, color: color.ink, letterSpacing: -0.2 },
  seats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: color.blueWash,
    paddingHorizontal: s(9),
    paddingVertical: s(3),
    borderRadius: 999,
  },
  seatsText: { fontSize: f(10.5), fontWeight: weight.bold, color: color.blueDark },
  meta: { flex: 1, gap: s(2) },
  rating: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  ratingText: { fontSize: f(11.5), fontWeight: weight.bold, color: color.ink },
  fare: {
    fontSize: f(19),
    fontWeight: weight.black,
    color: color.ink,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  truncated: { textAlign: 'center', marginTop: s(4) },
  footnote: { textAlign: 'center', marginTop: s(8), paddingHorizontal: s(12) },
});
