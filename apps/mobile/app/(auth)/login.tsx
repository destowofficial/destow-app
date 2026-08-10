import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Footer,
  H1,
  Label,
  P,
  Screen,
  Small,
} from '../../components/ui/kit';
import { Logo } from '../../components/ui/Logo';
import { color, radius, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { requestOtp } from '../../services/destow';
import { ApiError, NetworkError } from '../../services/http';
import { useAuthStore } from '../../stores/useAuthStore';

// The only identity a customer ever types. There is no password anywhere in
// this app - the number is proved by OTP and that is the whole of it.

// Indian mobiles: ten digits starting 6-9. Checked here so an obviously wrong
// number never costs a send, and so the server's own rejection is a surprise
// rather than the normal case.
const VALID = /^[6-9]\d{9}$/;

export default function Login() {
  const setPendingPhone = useAuthStore((st) => st.setPendingPhone);
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = VALID.test(digits);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const sent = await requestOtp(digits);
      // devCode is present only when the server is running with OTP_DEV_ECHO,
      // which it refuses to do in production.
      setPendingPhone(digits, sent.devCode ?? null);
      router.push('/(auth)/otp');
    } catch (e) {
      if (e instanceof NetworkError) {
        setError('No connection. Check your network and try again.');
      } else if (e instanceof ApiError) {
        // Rate limits key on the number, so the wait is the message that
        // matters - not a generic failure.
        setError(e.fieldError('phone') ?? e.error);
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <View style={styles.brand}>
            <Logo height={s(46)} />
          </View>

          <View style={styles.fill}>
            <View style={styles.intro}>
              <H1>Your number</H1>
              <P style={[{ fontSize: f(14) }, styles.introText]}>
                We&apos;ll text you a six-digit code to confirm it.
              </P>
            </View>

            <View style={[styles.entry, digits.length > 0 && styles.entryFocused]}>
              <Label>Mobile</Label>
              <View style={styles.entryRow}>
              <Text style={styles.country}>+91</Text>
              <View style={styles.entryDivider} />
              <TextInput
                value={digits}
                onChangeText={(t) => {
                  setDigits(t.replace(/\D/g, '').slice(0, 10));
                  setError(null);
                }}
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                placeholder="98765 43210"
                placeholderTextColor={color.dim}
                style={styles.input}
                maxLength={10}
                autoFocus
                accessibilityLabel="Mobile number"
              />
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>

        <Footer>
          <Button label="Send code" onPress={send} loading={busy} disabled={!ready} />
          <Small style={styles.legal}>
            By continuing you agree to the Terms and Privacy Policy.
          </Small>
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Centred rather than top-aligned. There are three things on this screen and
  // stacking them under the notch leaves the bottom two thirds empty, which
  // reads as an unfinished screen rather than a calm one.
  body: { flex: 1, paddingHorizontal: s(18), paddingTop: s(30) },
  // One composed block rather than a logo pinned to the ceiling and the rest
  // floating in the middle: centring the content in *all* the leftover space
  // left a dead band about a third of the screen tall under the wordmark.
  fill: { paddingTop: s(30), gap: s(20) },
  brand: { alignItems: 'center' },
  introText: { textAlign: 'center' },
  intro: { gap: s(7), alignItems: 'center' },
  entry: {
    gap: s(7),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    paddingHorizontal: s(14),
    paddingVertical: s(13),
    borderWidth: 1,
    borderColor: color.line,
  },
  entryFocused: { borderWidth: 2, borderColor: color.blue },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: s(11) },
  country: { fontSize: f(16), fontWeight: weight.semi, color: color.sub },
  entryDivider: { width: 1, height: f(22), backgroundColor: color.line },
  input: {
    flex: 1,
    fontSize: f(17),
    fontWeight: weight.semi,
    color: color.ink,
    letterSpacing: 0.4,
    padding: 0,
  },
  error: { fontSize: f(13), color: color.red, lineHeight: f(19), textAlign: 'center' },
  legal: { textAlign: 'center', marginTop: s(12) },
});
