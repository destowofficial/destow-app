import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import {
  Button,
  Card,
  ErrorState,
  Footer,
  Header,
  Loading,
  Row,
  Screen,
  Small,
} from '../../../components/ui/kit';
import { color, weight } from '../../../theme/tokens';
import { f, s, screenWidth } from '../../../theme/responsive';
import { startQrPayment, paymentStatus, type QrPayment } from '../../../services/destow';
import { messageFor } from '../../../hooks/useAsync';

// Scan, pay, done.
//
// Settlement never comes from this screen. The gateway tells the server the
// money landed and the server settles the booking; this only asks "is it paid
// yet?" until the answer changes. A client that could report its own payment
// would be a client that could pay for free.
const POLL_MS = 2500;

export default function Qr() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [qr, setQr] = useState<QrPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const polling = useRef(true);

  // Raise the QR once. Re-entering the screen reuses whatever the server has,
  // so a customer who backs out does not accumulate codes.
  useEffect(() => {
    let alive = true;
    startQrPayment(id)
      .then((p) => {
        if (!alive) return;
        if (p.alreadyPaid) {
          router.replace({ pathname: '/trip/[id]/paid', params: { id } });
          return;
        }
        setQr(p);
      })
      .catch((e) => alive && setError(messageFor(e)));
    return () => {
      alive = false;
    };
  }, [id]);

  // Poll while the screen is in front. Backgrounding stops it: a phone in a
  // pocket does not need to ask every two seconds, and the customer will be
  // looking at their UPI app anyway.
  useEffect(() => {
    if (!qr) return;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (!polling.current) return;
      try {
        const st = await paymentStatus(id);
        if (st.paymentStatus === 'paid') {
          polling.current = false;
          router.replace({ pathname: '/trip/[id]/paid', params: { id } });
          return;
        }
      } catch {
        // A dropped poll is not worth surfacing - the next one will do.
      }
      timer = setTimeout(tick, POLL_MS);
    };

    timer = setTimeout(tick, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      polling.current = s === 'active';
      if (s === 'active') void tick();
    });

    return () => {
      polling.current = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, [qr, id]);

  // How long the code stands. A stale QR must not be paid against a fare that
  // has since changed.
  useEffect(() => {
    if (!qr) return;
    const end = new Date(qr.expiresAt).getTime();
    const t = setInterval(() => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [qr]);

  if (error) {
    return (
      <Screen>
        <Header title="Scan to pay" onBack={() => router.back()} />
        <ErrorState message={error} onRetry={() => router.replace({ pathname: '/trip/[id]/qr', params: { id } })} />
      </Screen>
    );
  }
  if (!qr) return <Screen><Header onBack={() => router.back()} /><Loading label="Raising a QR…" /></Screen>;

  const size = Math.min(screenWidth - s(120), s(230));
  const expired = left !== null && left <= 0;

  return (
    <Screen>
      <Header title="Scan to pay" onBack={() => router.back()} />

      <View style={styles.body}>
        <Text style={styles.amount}>{qr.amountDisplay}</Text>

        <Card lift style={styles.plate}>
          {expired ? (
            <View style={[styles.expired, { width: size, height: size }]}>
              <Small style={styles.expiredText}>This code has expired</Small>
            </View>
          ) : (
            <QRCode value={qr.payload} size={size} backgroundColor={color.white} color={color.ink} />
          )}
        </Card>

        <Small style={styles.hint}>
          Open GPay, PhonePe, Paytm{'\n'}or any UPI app and scan this
        </Small>

        <Card style={styles.status}>
          <Row style={styles.statusRow}>
            <View style={[styles.pulse, expired && styles.pulseOff]} />
            <Text style={styles.statusText}>
              {expired ? 'Waiting stopped' : 'Waiting for payment…'}
            </Text>
            {left !== null && !expired ? (
              <Text style={styles.timer}>
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
              </Text>
            ) : null}
          </Row>
        </Card>
      </View>

      <Footer>
        {expired ? (
          <Button
            label="Get a new code"
            onPress={() => router.replace({ pathname: '/trip/[id]/qr', params: { id } })}
          />
        ) : (
          <Button label="Pay cash instead" variant="ghost" onPress={() => router.back()} />
        )}
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', paddingHorizontal: s(18), gap: s(13) },
  amount: {
    fontSize: f(31),
    fontWeight: weight.black,
    color: color.ink,
    letterSpacing: -1.3,
    fontVariant: ['tabular-nums'],
  },
  plate: { padding: s(13) },
  expired: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg },
  expiredText: { textAlign: 'center' },
  hint: { textAlign: 'center', lineHeight: f(18) },
  status: { width: '100%', backgroundColor: color.bg, padding: s(13) },
  statusRow: { justifyContent: 'flex-start', gap: s(11) },
  pulse: { width: s(9), height: s(9), borderRadius: 999, backgroundColor: color.blue },
  pulseOff: { backgroundColor: color.dim },
  statusText: { flex: 1, fontSize: f(12.5), fontWeight: weight.semi, color: color.ink },
  timer: { fontSize: f(11.5), color: color.dim, fontVariant: ['tabular-nums'] },
});
