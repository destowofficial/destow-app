import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { VehicleCategory } from '@destow/contracts';
import {
  Card,
  Chips,
  Empty,
  ErrorState,
  Label,
  PageHead,
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

// The catalogue, priced.
//
// Every row leads with the total for the whole round trip rather than the
// per-kilometre rate: the rate on its own is a number nobody can act on, and
// the total is what decides which car someone takes. The rate stays underneath
// it, because it is how the total can be checked.
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
  const roundTrip = route ? km(route.distanceM * 2) : null;

  return (
    <Screen ground={color.blue}>
      <PageHead
        title="Choose a vehicle"
        subtitle={`${from} → ${to}${roundTrip ? `  ·  ${roundTrip} return` : ''}`}
        onBack={() => router.back()}
      />

      <View style={styles.sheet}>
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
            body="No operator is serving it. Try a nearby city, or a different date."
          />
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {listing.data!.vehicles.map((v, i) => (
              <Card
                key={v.vehicleId}
                lift={i === 0}
                style={styles.card}
                onPress={() => {
                  setVehicle(v, listing.data!.route);
                  router.push('/(booking)/review');
                }}
              >
                <Row style={styles.top}>
                  <View style={styles.name}>
                    <Text style={styles.type}>{v.vehicleTypeName}</Text>
                    {v.modelName ? <Small numberOfLines={1}>{v.modelName}</Small> : null}
                  </View>
                  {/* Cheapest first, so the first row is the one most people
                      take - worth saying rather than leaving them to infer. */}
                  {i === 0 ? (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>Cheapest</Text>
                    </View>
                  ) : null}
                </Row>

                <View style={styles.specs}>
                  <Spec icon="user" label={`${v.seats} seats`} />
                  <Spec icon="pin" label={`${v.bags} bags`} />
                  <Spec
                    icon="star"
                    label={v.providerRatingAvg ? v.providerRatingAvg.toFixed(1) : 'New'}
                    tint={v.providerRatingAvg ? color.star : color.dim}
                  />
                </View>

                <View style={styles.rule} />

                <Row>
                  <View style={styles.priceText}>
                    <Label>Round trip</Label>
                    <Small>
                      {rupees(v.pricePerKmPaise)}/km · {v.providerName}
                    </Small>
                  </View>
                  <Text style={styles.fare}>{v.totalFareDisplay}</Text>
                </Row>
              </Card>
            ))}

            {listing.data!.truncated ? (
              <Small style={styles.quiet}>
                Showing the {listing.data!.vehicles.length} cheapest of{' '}
                {listing.data!.totalAvailable}.
              </Small>
            ) : null}

            <Small style={styles.quiet}>
              An estimate. You pay for the kilometres actually driven.
            </Small>
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

function Spec({
  icon,
  label,
  tint = color.sub,
}: {
  icon: 'user' | 'pin' | 'star';
  label: string;
  tint?: string;
}) {
  return (
    <View style={styles.spec}>
      <Icon name={icon} size={13} color={tint} />
      <Text style={styles.specText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: color.bg },
  filters: { paddingHorizontal: s(18), paddingTop: s(14), paddingBottom: s(4) },
  list: { paddingHorizontal: s(18), paddingTop: s(10), paddingBottom: s(28), gap: s(11) },

  card: { padding: s(14) },
  top: { alignItems: 'flex-start', marginBottom: s(10) },
  name: { flex: 1, gap: s(1) },
  type: { fontSize: f(16), fontWeight: weight.bold, color: color.ink, letterSpacing: -0.3 },
  tag: {
    backgroundColor: color.okWash,
    borderRadius: 999,
    paddingHorizontal: s(9),
    paddingVertical: s(3),
  },
  tagText: { fontSize: f(10.5), fontWeight: weight.black, color: color.ok, letterSpacing: 0.3 },

  specs: { flexDirection: 'row', gap: s(14) },
  spec: { flexDirection: 'row', alignItems: 'center', gap: s(5) },
  specText: { fontSize: f(12.5), fontWeight: weight.semi, color: color.sub },

  rule: { height: 1, backgroundColor: color.line, marginVertical: s(12) },

  priceText: { flex: 1, gap: s(2) },
  fare: {
    fontSize: f(21),
    fontWeight: weight.black,
    color: color.ink,
    letterSpacing: -0.7,
    fontVariant: ['tabular-nums'],
  },

  quiet: { textAlign: 'center', marginTop: s(4), paddingHorizontal: s(12) },
});
