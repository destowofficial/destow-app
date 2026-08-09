import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  Card,
  Footer,
  Header,
  Label,
  Loading,
  P,
  Row,
  Screen,
  Small,
} from '../../components/ui/kit';
import { color, radius, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { listCities } from '../../services/destow';
import { useAsync } from '../../hooks/useAsync';
import { dayDate, time } from '../../lib/format';
import { useBookingStore } from '../../stores/useBookingStore';

// Where, and when there and back.
//
// The return is required rather than optional: Destow sells round trips only,
// and the return is what the vehicle's availability window is derived from -
// without one the car would be freed while it was still hundreds of kilometres
// away.
export default function Plan() {
  const draft = useBookingStore();
  const cities = useAsync(listCities, []);

  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  // Sensible defaults so the screen is never empty: leaving in a week, back
  // three days later, which is the shape of a Delhi-Manali trip.
  const pickup = draft.pickup ?? defaultPickup();
  const returnAt = draft.returnAt ?? new Date(pickup.getTime() + 3 * 86_400_000);

  const problem = useMemo(() => {
    if (!draft.from || !draft.to) return 'Choose where you are going.';
    if (draft.from === draft.to) return 'Pick two different places.';
    if (pickup.getTime() <= Date.now()) return 'Pickup has to be in the future.';
    if (returnAt.getTime() <= pickup.getTime()) return 'The return has to be after pickup.';
    return null;
  }, [draft.from, draft.to, pickup, returnAt]);

  function next() {
    draft.setDates({ pickup, returnAt });
    router.push('/(booking)/vehicles');
  }

  function shift(which: 'pickup' | 'returnAt', days: number) {
    if (which === 'pickup') {
      const p = new Date(pickup.getTime() + days * 86_400_000);
      draft.setDates({ pickup: p, returnAt: returnAt <= p ? new Date(p.getTime() + 86_400_000) : returnAt });
    } else {
      draft.setDates({ returnAt: new Date(returnAt.getTime() + days * 86_400_000) });
    }
  }

  return (
    <Screen>
      <Header title="Plan your trip" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={styles.legs}>
          <Pressable style={styles.leg} onPress={() => setPicking('from')}>
            <Ionicons name="ellipse-outline" size={f(17)} color={color.ok} />
            <View style={styles.legText}>
              <Label>From</Label>
              <Text style={[styles.legValue, !draft.from && styles.placeholder]}>
                {draft.from || 'Pick up from'}
              </Text>
            </View>
          </Pressable>
          <View style={styles.legDivider} />
          <Pressable style={styles.leg} onPress={() => setPicking('to')}>
            <Ionicons name="location-outline" size={f(17)} color={color.red} />
            <View style={styles.legText}>
              <Label>To</Label>
              <Text style={[styles.legValue, !draft.to && styles.placeholder]}>
                {draft.to || 'Where are you going?'}
              </Text>
            </View>
          </Pressable>
        </Card>

        <DateRow
          icon="calendar-outline"
          label="Departure"
          value={`${dayDate(pickup)} · ${time(pickup)}`}
          onEarlier={() => shift('pickup', -1)}
          onLater={() => shift('pickup', 1)}
        />
        <DateRow
          icon="calendar"
          label="Return"
          tint={color.ok}
          value={`${dayDate(returnAt)} · ${time(returnAt)}`}
          onEarlier={() => shift('returnAt', -1)}
          onLater={() => shift('returnAt', 1)}
        />

        <Card tone="blue" style={styles.note}>
          <Row style={{ justifyContent: 'flex-start', gap: s(10), alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={f(17)} color={color.blueDark} />
            <Text style={styles.noteText}>
              The vehicle and driver stay with you for the whole trip. You pay afterwards, for the
              kilometres actually run.
            </Text>
          </Row>
        </Card>
      </ScrollView>

      <Footer>
        {problem ? <Small style={styles.problem}>{problem}</Small> : null}
        <Button label="See available vehicles" onPress={next} disabled={!!problem} />
      </Footer>

      <Modal visible={picking !== null} animationType="slide" onRequestClose={() => setPicking(null)}>
        <Screen>
          <Header
            title={picking === 'from' ? 'Pick up from' : 'Going to'}
            onBack={() => setPicking(null)}
          />
          {cities.loading ? (
            <Loading />
          ) : (
            <ScrollView contentContainerStyle={styles.cityList}>
              {(cities.data ?? []).map((c) => (
                <Card
                  key={c.id}
                  style={styles.cityRow}
                  onPress={() => {
                    draft.setRoute(
                      picking === 'from'
                        ? { from: c.name, to: draft.to }
                        : { from: draft.from, to: c.name },
                    );
                    setPicking(null);
                  }}
                >
                  <Row>
                    <View>
                      <Text style={styles.cityName}>{c.name}</Text>
                      {c.state ? <Small>{c.state}</Small> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={f(16)} color={color.dim} />
                  </Row>
                </Card>
              ))}
            </ScrollView>
          )}
        </Screen>
      </Modal>
    </Screen>
  );
}

function DateRow({
  icon,
  label,
  value,
  tint = color.blue,
  onEarlier,
  onLater,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint?: string;
  onEarlier: () => void;
  onLater: () => void;
}) {
  return (
    <Card style={styles.dateCard}>
      <Row>
        <View style={[styles.plate, { backgroundColor: tint === color.ok ? color.okWash : color.blueWash }]}>
          <Ionicons name={icon} size={f(18)} color={tint} />
        </View>
        <View style={styles.legText}>
          <Label>{label}</Label>
          <Text style={styles.legValue}>{value}</Text>
        </View>
        <View style={styles.stepper}>
          <Pressable onPress={onEarlier} hitSlop={8} style={styles.step} accessibilityLabel={`${label} earlier`}>
            <Ionicons name="remove" size={f(16)} color={color.sub} />
          </Pressable>
          <Pressable onPress={onLater} hitSlop={8} style={styles.step} accessibilityLabel={`${label} later`}>
            <Ionicons name="add" size={f(16)} color={color.sub} />
          </Pressable>
        </View>
      </Row>
    </Card>
  );
}

/** Next week, 06:30 - the hour an outstation trip actually leaves. */
function defaultPickup(): Date {
  const d = new Date(Date.now() + 7 * 86_400_000);
  d.setHours(6, 30, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: s(18), paddingBottom: s(24), gap: s(13) },
  legs: { padding: s(6) },
  leg: { flexDirection: 'row', alignItems: 'center', gap: s(11), padding: s(10) },
  legText: { flex: 1 },
  legValue: { fontSize: f(14.5), fontWeight: weight.semi, color: color.ink },
  placeholder: { color: color.dim, fontWeight: weight.medium },
  legDivider: { height: 1, backgroundColor: color.line, marginLeft: s(38) },

  dateCard: { padding: s(13) },
  plate: {
    width: s(36),
    height: s(36),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: { flexDirection: 'row', gap: s(6) },
  step: {
    width: s(30),
    height: s(30),
    borderRadius: radius.sm,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  note: { padding: s(13) },
  noteText: { flex: 1, fontSize: f(12.5), color: color.blueDark, lineHeight: f(18) },
  problem: { textAlign: 'center', marginBottom: s(10), color: color.warn },

  cityList: { paddingHorizontal: s(18), paddingBottom: s(24), gap: s(9) },
  cityRow: { padding: s(13) },
  cityName: { fontSize: f(14.5), fontWeight: weight.semi, color: color.ink },
});
