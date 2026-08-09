import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Button, Card, Divider, ErrorState, Footer, H1, H3, Loading, P, Row, Screen, Small,
} from '../../../components/ui/kit';
import { Icon } from '../../../components/ui/Icon';
import { color, weight } from '../../../theme/tokens';
import { f, s } from '../../../theme/responsive';
import { previewCancellation, cancelBooking } from '../../../services/destow';
import { useAsync, messageFor } from '../../../hooks/useAsync';
import { dayDate } from '../../../lib/format';

// The number, before they commit to it.
//
// Under postpaid nothing has been taken, so a late cancellation is a charge
// rather than a deduction from a refund - and someone who only learns that
// afterwards reads it as a trick, however clearly the terms say it.
export default function Cancel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const preview = useAsync(() => previewCancellation(id), [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (preview.loading && !preview.data) return <Screen><Loading /></Screen>;
  if (preview.error || !preview.data) {
    return <Screen><ErrorState message={preview.error ?? 'Not found'} onRetry={preview.reload} /></Screen>;
  }

  const c = preview.data;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await cancelBooking(id);
      router.dismissAll();
      router.replace('/(tabs)/trips');
    } catch (e) {
      setError(messageFor(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.headline}>
          <H1>Cancel this trip?</H1>
          {c.isFree ? (
            <P>You can cancel this one free of charge.</P>
          ) : (
            <P>Free cancellation ended on {dayDate(c.freeUntil)}.</P>
          )}
        </View>

        <Card style={styles.sums}>
          <Row style={styles.line}>
            <Small>Estimated fare</Small>
            <Text style={styles.value}>{c.alreadyPaid ? c.refundDisplay : c.cancellationFeeDisplay}</Text>
          </Row>
          <Row style={styles.line}>
            <Small>Cancellation fee ({(c.feeBps / 100).toFixed(0)}%)</Small>
            <Text style={[styles.value, c.cancellationFeePaise > 0 && { color: color.red }]}>
              {c.cancellationFeeDisplay}
            </Text>
          </Row>
          <Divider style={{ marginVertical: s(11) }} />
          <Row>
            <H3>{c.alreadyPaid ? 'You get back' : "You'll be charged"}</H3>
            <Text
              style={[
                styles.total,
                { color: c.alreadyPaid ? color.ok : c.cancellationFeePaise > 0 ? color.red : color.ok },
              ]}
            >
              {c.alreadyPaid ? c.refundDisplay : c.cancellationFeeDisplay}
            </Text>
          </Row>
        </Card>

        {!c.isFree ? (
          <Card tone="warn" style={styles.note}>
            <Row style={styles.noteRow}>
              <Icon name="clock" size={17} color={color.warn} />
              <Text style={styles.noteText}>
                Your driver has held this vehicle for you. The fee is what the operator keeps for
                the day they lose.
              </Text>
            </Row>
          </Card>
        ) : null}

        <Small style={styles.footnote}>
          {c.alreadyPaid
            ? 'Refunds reach your account in 5–7 working days.'
            : 'Added to this booking. You have paid nothing so far.'}
        </Small>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Footer>
        <Button
          label={c.cancellationFeePaise > 0 ? `Cancel and accept the ${c.cancellationFeeDisplay} fee` : 'Cancel this trip'}
          variant="danger"
          loading={busy}
          disabled={!c.cancellable}
          onPress={confirm}
        />
        <Button label="Keep my trip" variant="ghost" onPress={() => router.back()} style={{ marginTop: s(9) }} />
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: s(18), paddingTop: s(20), gap: s(14) },
  headline: { gap: s(6) },
  sums: {},
  line: { marginBottom: s(10) },
  value: { fontSize: f(14.5), fontWeight: weight.semi, color: color.ink, fontVariant: ['tabular-nums'] },
  total: { fontSize: f(25), fontWeight: weight.black, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  note: { padding: s(13) },
  noteRow: { justifyContent: 'flex-start', gap: s(10), alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: f(12.5), color: color.warn, lineHeight: f(18) },
  footnote: { textAlign: 'center' },
  error: { fontSize: f(13), color: color.red, textAlign: 'center' },
});
