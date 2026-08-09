import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Footer, H1, P, Screen, Small } from '../../components/ui/kit';
import { Logo } from '../../components/ui/Logo';
import { color, radius, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { requestOtp, verifyOtp } from '../../services/destow';
import { ApiError, NetworkError } from '../../services/http';
import { useAuthStore } from '../../stores/useAuthStore';

const LENGTH = 6;
const RESEND_SECONDS = 30;

export default function Otp() {
  const phone = useAuthStore((st) => st.pendingPhone);
  const devCode = useAuthStore((st) => st.devCode);
  const setUser = useAuthStore((st) => st.setUser);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // A six-digit code is the whole gesture, so submit on the last digit rather
  // than making someone reach for a button they were always going to press.
  useEffect(() => {
    if (code.length === LENGTH && !busy) void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const user = await verifyOtp({ phone, code });
      setUser(user);
      // A new account has no name yet, and a driver has to ask for someone at
      // pickup - so that is the one thing collected before booking.
      router.replace(user.name ? '/(tabs)' : '/(auth)/signup');
    } catch (e) {
      setCode('');
      if (e instanceof NetworkError) {
        setError('No connection. Check your network and try again.');
      } else if (e instanceof ApiError) {
        setError(e.error);
        // The server counts attempts before checking, and says how many are
        // left. Silence here reads as a broken app.
        const left = e.details?.attemptsLeft?.[0];
        setAttemptsLeft(left ? Number(left) : null);
      } else {
        setError('Something went wrong. Try again.');
      }
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setAttemptsLeft(null);
    setCode('');
    try {
      await requestOtp(phone);
      setCountdown(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof ApiError ? e.error : 'Could not send a new code.');
    }
  }

  const boxes = Array.from({ length: LENGTH }, (_, i) => code[i] ?? '');
  const pretty = phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : '';

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Text style={styles.chev}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.brand}>
          <Logo height={s(40)} />
        </View>

        <View style={styles.fill}>
          <View style={styles.intro}>
            <H1>Enter the code</H1>
            <P style={[{ fontSize: f(14) }, styles.introText]}>
              Sent to {pretty} · <Text style={styles.change} onPress={() => router.back()}>Change</Text>
            </P>
          </View>

          {/* One hidden input behind six boxes: the OS keyboard and SMS
              autofill both want a single field, and six real inputs fight it. */}
          <Pressable
            style={styles.boxes}
            onPress={() => input.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel="Enter the six digit code"
          >
            {boxes.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.box,
                  (i === code.length || (code.length === LENGTH && i === LENGTH - 1)) && styles.boxOn,
                ]}
              >
                <Text style={styles.boxText}>{d}</Text>
              </View>
            ))}
            <TextInput
              ref={input}
              value={code}
              onChangeText={(t) => {
                setCode(t.replace(/\D/g, '').slice(0, LENGTH));
                setError(null);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={LENGTH}
              autoFocus
              style={styles.hidden}
              accessibilityLabel="Six digit code"
            />
          </Pressable>

          {devCode ? (
            <Pressable onPress={() => setCode(devCode)} accessibilityRole="button">
              <Card tone="blue" style={styles.dev}>
                <Text style={styles.devLabel}>Development server</Text>
                <Text style={styles.devCode}>{devCode}</Text>
                <Text style={styles.devHint}>Tap to fill</Text>
              </Card>
            </Pressable>
          ) : null}

          {error ? (
            <Card tone="warn" style={styles.notice}>
              <Text style={styles.noticeText}>
                {error}
                {attemptsLeft !== null
                  ? ` ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`
                  : ''}
              </Text>
            </Card>
          ) : null}

          <View style={styles.resend}>
            {countdown > 0 ? (
              <P style={styles.centre}>
                Resend code in{' '}
                <Text style={styles.timer}>0:{String(countdown).padStart(2, '0')}</Text>
              </P>
            ) : (
              <Pressable onPress={resend} accessibilityRole="button">
                <Text style={styles.resendLink}>Send a new code</Text>
              </Pressable>
            )}
        </View>
        </View>
      </View>

      <Footer>
        <Button
          label="Verify"
          onPress={verify}
          loading={busy}
          disabled={code.length !== LENGTH}
        />
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: s(18), paddingTop: s(2) },
  chev: { fontSize: f(30), lineHeight: f(30), color: color.ink },
  // Same reasoning as the phone screen: six boxes and a countdown do not fill a
  // phone, so they sit in the middle rather than clinging to the top.
  body: { flex: 1, paddingHorizontal: s(18), paddingTop: s(30) },
  // The wordmark sits at the top; everything else centres in the space below
  // it, so the screen reads as branded rather than as one floating block.
  fill: { flex: 1, justifyContent: 'center', paddingBottom: s(48), gap: s(22) },
  brand: { alignItems: 'center' },
  intro: { gap: s(7), alignItems: 'center' },
  change: { color: color.blue, fontWeight: weight.bold },
  introText: { textAlign: 'center' },

  boxes: { flexDirection: 'row', gap: s(9) },
  box: {
    flex: 1,
    height: s(54),
    borderRadius: radius.lg,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { borderWidth: 2, borderColor: color.blue },
  boxText: { fontSize: f(22), fontWeight: weight.bold, color: color.ink },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },

  notice: { padding: s(13) },
  noticeText: { fontSize: f(12.5), color: color.warn, lineHeight: f(18) },

  resend: { alignItems: 'center' },
  centre: { textAlign: 'center' },
  timer: { color: color.ink, fontWeight: weight.bold },
  resendLink: { fontSize: f(13), color: color.blue, fontWeight: weight.bold },
  // Only ever rendered when the API echoes the code back, which it does solely
  // with OTP_DEV_ECHO on - a flag parseEnv refuses to accept in production.
  dev: { alignItems: 'center', paddingVertical: s(12) },
  devLabel: {
    fontSize: f(10),
    fontWeight: weight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.blueDark,
  },
  devCode: {
    fontSize: f(28),
    fontWeight: weight.black,
    color: color.blueDark,
    letterSpacing: 6,
    marginTop: s(4),
    fontVariant: ['tabular-nums'],
  },
  devHint: { fontSize: f(11), color: color.blueDark, opacity: 0.7, marginTop: s(2) },
});
