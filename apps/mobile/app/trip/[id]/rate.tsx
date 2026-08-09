import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, ErrorState, Footer, H1, Loading, P, Screen, Small } from '../../../components/ui/kit';
import { color, radius, weight } from '../../../theme/tokens';
import { f, s } from '../../../theme/responsive';
import { getBooking, rateBooking } from '../../../services/destow';
import { useAsync, messageFor } from '../../../hooks/useAsync';
import { tripDates } from '../../../lib/format';

// The only thing feeding operator quality, so it is worth asking for properly.
export default function Rate() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useAsync(() => getBooking(id), [id]);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (trip.loading && !trip.data) return <Screen><Loading /></Screen>;
  if (trip.error || !trip.data) {
    return <Screen><ErrorState message={trip.error ?? 'Trip not found'} onRetry={trip.reload} /></Screen>;
  }
  const b = trip.data;
  const who = b.driverName?.split(' ')[0];

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await rateBooking(id, { rating: stars, ...(comment.trim() ? { comment: comment.trim() } : {}) });
      router.dismissAll();
      router.replace('/(tabs)/trips');
    } catch (e) {
      setError(messageFor(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Small style={styles.skip}>Not now</Small>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(b.driverName ?? b.providerName).split(' ').slice(0, 2).map((p) => p[0]).join('')}
          </Text>
        </View>

        <View style={styles.headline}>
          <H1 style={styles.centre}>
            How was your trip{who ? `\nwith ${who}?` : '?'}
          </H1>
          <P style={styles.centre}>
            {b.from} ⇄ {b.to} · {tripDates(b.pickupDatetime, b.returnDatetime)}
          </P>
        </View>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setStars(n)} hitSlop={6} accessibilityLabel={`${n} stars`}>
              <Ionicons
                name={n <= stars ? 'star' : 'star-outline'}
                size={f(34)}
                color={n <= stars ? color.star : color.line}
              />
            </Pressable>
          ))}
        </View>

        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Anything worth mentioning? (optional)"
          placeholderTextColor={color.dim}
          multiline
          style={styles.comment}
          maxLength={500}
        />

        <Small style={styles.centre}>
          Your rating shows on the operator&apos;s profile.{'\n'}Your name does not.
        </Small>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Footer>
        <Button label="Submit rating" onPress={submit} loading={busy} disabled={stars === 0} />
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: s(18), paddingTop: s(2), alignItems: 'flex-end' },
  skip: { fontWeight: weight.semi, color: color.sub },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: s(18), paddingTop: s(20), gap: s(18) },
  avatar: { width: s(66), height: s(66), borderRadius: 999, backgroundColor: color.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: color.white, fontSize: f(23), fontWeight: weight.bold },
  headline: { gap: s(6) },
  centre: { textAlign: 'center' },
  stars: { flexDirection: 'row', gap: s(7) },
  comment: {
    width: '100%',
    minHeight: s(92),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    padding: s(14),
    fontSize: f(13.5),
    color: color.ink,
    textAlignVertical: 'top',
  },
  error: { fontSize: f(13), color: color.red, textAlign: 'center' },
});
