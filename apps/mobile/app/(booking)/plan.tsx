import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Footer, Header, Label, Screen, Small } from '../../components/ui/kit';
import { DestinationSheet } from '../../components/DestinationSheet';
import { DatePickerSheet } from '../../components/DatePickerSheet';
import { Icon } from '../../components/ui/Icon';
import { color, radius, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { listCities, listPopularRoutes } from '../../services/destow';
import { useAsync } from '../../hooks/useAsync';
import { dayDate, time } from '../../lib/format';
import { useBookingStore } from '../../stores/useBookingStore';

// A dozen stops is a different product and a much longer quote, so the
// itinerary is capped where a real outstation hire sits.
const MAX_STOPS = 3;

// Three answers: where from, where to, and when you leave.
//
// There is deliberately no return date. A round trip comes back when it comes
// back - people extend by a day, weather closes a pass - and asking for a date
// nobody can honestly give invites a wrong one. The fare is settled on the
// kilometres actually run, so the return was never a price input; what it did
// feed was the vehicle's availability window, and that is now estimated from
// the route instead of typed by the customer.
export default function Plan() {
  const draft = useBookingStore();
  const cities = useAsync(listCities, []);
  const routes = useAsync(listPopularRoutes, []);

  type Target = 'from' | 'to' | { stop: number };
  const [picking, setPicking] = useState<Target | null>(null);
  const [pickingDate, setPickingDate] = useState(false);

  const pickup = draft.pickup ?? defaultPickup();

  // The button carries the state on its own. Both ends chosen, different from
  // each other, and a departure still to come - anything less and there is
  // nothing to search for, which the disabled button already says.
  const ready = useMemo(
    () =>
      !!draft.from &&
      !!draft.to &&
      draft.from !== draft.to &&
      pickup.getTime() > Date.now(),
    [draft.from, draft.to, pickup],
  );

  // Turning the trip round is one tap, not two trips through the search sheet.
  function swap() {
    draft.setRoute({ from: draft.to, to: draft.from });
  }

  function next() {
    draft.setDates({ pickup });
    router.push('/(booking)/vehicles');
  }

  return (
    <Screen>
      <Header title="Plan your trip" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card lift style={styles.legs}>
          {/* A rail rather than a divider: the dots, the line and the pin say
              "one journey, several calls" at a glance, which flat rules do not.
              It is drawn per row so it stays aligned as stops are added. */}
          <View style={styles.stack}>
            <RailRow first tint={color.ok}>
              <Leg
                label="Pickup"
                value={draft.from}
                placeholder="Where should we collect you?"
                onPress={() => setPicking('from')}
              />
            </RailRow>

            {draft.stops.map((stop, i) => (
              <RailRow key={`${stop}-${i}`} tint={color.blue}>
                <Leg
                  label={`Stop ${i + 1}`}
                  value={stop}
                  placeholder="Where are you calling at?"
                  onPress={() => setPicking({ stop: i })}
                />
                <Pressable
                  onPress={() => draft.removeStop(i)}
                  hitSlop={10}
                  style={styles.drop}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove stop ${i + 1}`}
                >
                  <Icon name="cross" size={15} color={color.dim} />
                </Pressable>
              </RailRow>
            ))}

            <RailRow last tint={color.red}>
              <Leg
                label="Destination"
                value={draft.to}
                placeholder="Where are you going?"
                onPress={() => setPicking('to')}
              />
              <Pressable
                onPress={swap}
                disabled={!draft.from && !draft.to}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.swap,
                  pressed && styles.swapPressed,
                  !draft.from && !draft.to && styles.swapOff,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Swap pickup and destination"
              >
                <Icon name="swap" size={16} color={color.sub} />
              </Pressable>
            </RailRow>
          </View>

          {/* A hire with a call on the way is still one hire. Capped, because a
              dozen stops is a different product and a much longer quote. */}
          {draft.stops.length < MAX_STOPS ? (
            <Pressable
              onPress={() => setPicking({ stop: draft.stops.length })}
              style={({ pressed }) => [styles.addStop, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Add a stop"
            >
              <Icon name="plus" size={15} color={color.blue} />
              <Text style={styles.addStopText}>Add a stop</Text>
            </Pressable>
          ) : null}
        </Card>

        <Card lift style={styles.date} onPress={() => setPickingDate(true)}>
          <View style={styles.plate}>
            <Icon name="calendar" size={19} color={color.blue} />
          </View>
          <View style={styles.dateText}>
            <Label>Departure</Label>
            <Text style={styles.value}>{dayDate(pickup)}</Text>
            <Small>Pickup at {time(pickup)}</Small>
          </View>
          <Icon name="forward" size={17} color={color.dim} />
        </Card>
      </ScrollView>

      <Footer>
        <Button label="See available vehicles" onPress={next} disabled={!ready} />
      </Footer>

      <DestinationSheet
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(name) => {
          if (picking === 'from') draft.setRoute({ from: name, to: draft.to });
          else if (picking === 'to') draft.setRoute({ from: draft.from, to: name });
          else if (picking) {
            // Adding lands one past the end; editing lands on an existing row.
            if (picking.stop >= draft.stops.length) draft.addStop(name);
            else draft.setStop(picking.stop, name);
          }
          setPicking(null);
        }}
        cities={cities.data ?? []}
        popular={routes.data ?? []}
        exclude={picking === 'from' ? draft.to : picking === 'to' ? draft.from : undefined}
        mapTitle={
          picking === 'from'
            ? 'Pickup point'
            : picking === 'to'
              ? 'Destination'
              : 'Stop on the way'
        }
        placeholder={
          picking === 'from'
            ? 'Where should we collect you?'
            : picking === 'to'
              ? 'Where do you want to go?'
              : 'Where are you calling at?'
        }
      />

      <DatePickerSheet
        open={pickingDate}
        value={pickup}
        onClose={() => setPickingDate(false)}
        onConfirm={(d) => {
          draft.setDates({ pickup: d });
          setPickingDate(false);
        }}
      />
    </Screen>
  );
}

// One row of the itinerary, with its own piece of the rail. Drawn per row so
// the dots stay on their values however many stops there are.
function RailRow({
  children,
  tint,
  first,
  last,
}: {
  children: React.ReactNode;
  tint: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.railLine, first && styles.railHidden]} />
        {last ? (
          <Icon name="pin" size={15} color={tint} />
        ) : (
          <View style={[styles.railDot, { borderColor: tint }]} />
        )}
        <View style={[styles.railLine, last && styles.railHidden]} />
      </View>
      <View style={styles.rowBody}>{children}</View>
    </View>
  );
}

function Leg({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.leg, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || placeholder}`}
    >
      <Label>{label}</Label>
      <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
    </Pressable>
  );
}

/** Next week, 06:30 - the hour an outstation trip actually leaves. */
function defaultPickup(): Date {
  const d = new Date(Date.now() + 7 * 86_400_000);
  d.setHours(6, 30, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: s(18), paddingBottom: s(24), gap: s(12), paddingTop: s(4) },

  legs: { padding: s(12) },
  stack: {},
  row: { flexDirection: 'row', alignItems: 'stretch', gap: s(12) },
  rail: { width: s(16), alignItems: 'center' },
  railDot: {
    width: s(11),
    height: s(11),
    borderRadius: 999,
    borderWidth: 3,
    backgroundColor: color.card,
  },
  // Half a rail above and below each marker; the ends hide theirs, so the line
  // runs between the rows and stops at the pickup and the pin.
  railLine: { width: 2, flex: 1, minHeight: s(8), backgroundColor: color.line },
  railHidden: { backgroundColor: 'transparent' },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(8) },
  leg: { flex: 1, paddingVertical: s(11), gap: s(2) },
  legDivider: { height: 1, backgroundColor: color.line },
  pressed: { opacity: 0.55 },
  drop: {
    width: s(28),
    height: s(28),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingVertical: s(11),
    paddingLeft: s(28),
    marginTop: s(2),
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  addStopText: { fontSize: f(14), fontWeight: weight.bold, color: color.blue },
  swap: {
    width: s(36),
    height: s(36),
    borderRadius: 999,
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapPressed: { backgroundColor: color.blueWash, borderColor: color.blueBorder },
  swapOff: { opacity: 0.4 },

  date: { flexDirection: 'row', alignItems: 'center', gap: s(12), padding: s(14) },
  dateText: { flex: 1, gap: s(1) },
  plate: {
    width: s(38),
    height: s(38),
    borderRadius: radius.md,
    backgroundColor: color.blueWash,
    alignItems: 'center',
    justifyContent: 'center',
  },

  value: { fontSize: f(15), fontWeight: weight.bold, color: color.ink, letterSpacing: -0.2 },
  placeholder: { color: color.dim, fontWeight: weight.semi },

});
