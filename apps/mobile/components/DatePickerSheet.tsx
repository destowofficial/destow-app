import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Label } from './ui/kit';
import { Icon } from './ui/Icon';
import { color, radius, weight } from '../theme/tokens';
import { f, s } from '../theme/responsive';

// Choosing a departure day and the hour the car turns up.
//
// Hand-built rather than the native picker: this is the one screen in the
// booking flow where the whole month matters - an outstation trip is planned
// around a weekend or a holiday, and a spinner showing one date at a time hides
// exactly the thing being decided.
const DAY_MS = 86_400_000;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
// How far ahead a trip can be planned. Far enough for a holiday booked in
// advance, near enough that the month list stays scrollable.
const MONTHS_AHEAD = 6;
// Outstation departures cluster early - the whole point is to arrive in
// daylight - so the strip starts before dawn and stops in the evening.
const HOURS: Array<[number, number]> = [
  [4, 0], [4, 30], [5, 0], [5, 30], [6, 0], [6, 30], [7, 0], [7, 30],
  [8, 0], [8, 30], [9, 0], [10, 0], [11, 0], [12, 0], [14, 0], [16, 0],
  [18, 0], [20, 0],
];

export function DatePickerSheet({
  open,
  value,
  onClose,
  onConfirm,
}: {
  open: boolean;
  value: Date;
  onClose: () => void;
  onConfirm: (d: Date) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  // Re-seed whenever it is opened, so cancelling really does discard.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }

  const today = startOfDay(new Date());
  const months = useMemo(() => {
    const out: Date[] = [];
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 0; i < MONTHS_AHEAD; i++) {
      out.push(new Date(first.getFullYear(), first.getMonth() + i, 1));
    }
    return out;
  }, [today.getFullYear(), today.getMonth()]);

  function chooseDay(d: Date) {
    // Keep the hour already chosen; only the day changes.
    const next = new Date(d);
    next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
    setDraft(next);
  }

  function chooseTime(h: number, m: number) {
    const next = new Date(draft);
    next.setHours(h, m, 0, 0);
    setDraft(next);
  }

  // A departure has to be in the future, and an hour that has already passed
  // today is not a choice - so it is disabled rather than silently rejected on
  // the next screen.
  const isToday = sameDay(draft, today);
  const tooLate = (h: number, m: number) => {
    if (!isToday) return false;
    const now = new Date();
    return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
  };
  const valid = draft.getTime() > Date.now();

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + s(10) }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>When are you leaving?</Text>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={`${d}-${i}`} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>

          <ScrollView style={styles.months} showsVerticalScrollIndicator={false}>
            {months.map((m) => (
              <View key={m.toISOString()} style={styles.month}>
                <Label style={styles.monthName}>
                  {MONTHS[m.getMonth()]} {m.getFullYear()}
                </Label>
                <View style={styles.grid}>
                  {leadingBlanks(m).map((_, i) => (
                    <View key={`b${i}`} style={styles.cell} />
                  ))}
                  {daysOf(m).map((d) => {
                    const past = d.getTime() < today.getTime();
                    const on = sameDay(d, draft);
                    return (
                      <Pressable
                        key={d.toISOString()}
                        disabled={past}
                        onPress={() => chooseDay(d)}
                        style={[styles.cell, on && styles.cellOn]}
                        accessibilityRole="button"
                        accessibilityLabel={`${d.getDate()} ${MONTHS[d.getMonth()]}`}
                        accessibilityState={{ selected: on, disabled: past }}
                      >
                        <Text
                          style={[
                            styles.day,
                            past && styles.dayOff,
                            on && styles.dayOn,
                          ]}
                        >
                          {d.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <Label style={styles.pickupLabel}>Pickup time</Label>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.times}
          >
            {HOURS.map(([h, m]) => {
              const on = draft.getHours() === h && draft.getMinutes() === m;
              const off = tooLate(h, m);
              return (
                <Pressable
                  key={`${h}:${m}`}
                  disabled={off}
                  onPress={() => chooseTime(h, m)}
                  style={[styles.time, on && styles.timeOn, off && styles.timeOff]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: off }}
                >
                  <Text style={[styles.timeText, on && styles.timeTextOn, off && styles.dayOff]}>
                    {label(h, m)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.foot}>
            <Button
              label={valid ? `Leave ${dayLabel(draft)}` : 'Pick a time still to come'}
              onPress={() => onConfirm(draft)}
              disabled={!valid}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function daysOf(month: Date): Date[] {
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: last }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
}

/** Monday-first, which is how a week is read here. */
function leadingBlanks(month: Date): number[] {
  const weekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  return Array.from({ length: (weekday + 6) % 7 });
}

function label(h: number, m: number): string {
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
  return `${hh}${mm} ${h < 12 ? 'am' : 'pm'}`;
}

function dayLabel(d: Date): string {
  const today = startOfDay(new Date());
  const days = Math.round((startOfDay(d).getTime() - today.getTime()) / DAY_MS);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `on ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(16,24,40,0.45)', justifyContent: 'flex-end' },
  dismiss: { flex: 1, minHeight: s(40) },
  sheet: {
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: s(8),
    maxHeight: '90%',
  },
  grabber: {
    width: s(38),
    height: s(4),
    borderRadius: 999,
    backgroundColor: color.line,
    alignSelf: 'center',
    marginBottom: s(10),
  },
  title: {
    fontSize: f(18),
    fontWeight: weight.black,
    color: color.ink,
    letterSpacing: -0.4,
    paddingHorizontal: s(18),
    marginBottom: s(12),
  },

  weekRow: { flexDirection: 'row', paddingHorizontal: s(14), paddingBottom: s(6) },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: f(11),
    fontWeight: weight.bold,
    color: color.dim,
  },

  months: { flexGrow: 0 },
  month: { paddingHorizontal: s(14), paddingBottom: s(10) },
  monthName: { paddingHorizontal: s(4), marginBottom: s(6) },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  cellOn: { backgroundColor: color.blue },
  day: { fontSize: f(14), fontWeight: weight.semi, color: color.ink },
  dayOff: { color: color.dim },
  dayOn: { color: color.white, fontWeight: weight.bold },

  pickupLabel: { paddingHorizontal: s(18), marginTop: s(4), marginBottom: s(8) },
  times: { paddingHorizontal: s(18), gap: s(8), paddingBottom: s(4) },
  time: {
    paddingHorizontal: s(14),
    paddingVertical: s(9),
    borderRadius: 999,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
  },
  timeOn: { backgroundColor: color.blue, borderColor: color.blue },
  timeOff: { opacity: 0.45 },
  timeText: { fontSize: f(13.5), fontWeight: weight.bold, color: color.ink },
  timeTextOn: { color: color.white },

  foot: { paddingHorizontal: s(18), paddingTop: s(14) },
});
