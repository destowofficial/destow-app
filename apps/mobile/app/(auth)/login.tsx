import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Field,
  Footer,
  H1,
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
      await requestOtp(digits);
      setPendingPhone(digits);
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
          <Logo height={s(30)} />

          <View style={styles.intro}>
            <H1>Your number</H1>
            <P style={{ fontSize: f(14) }}>We&apos;ll text you a six-digit code to confirm it.</P>
          </View>

          <View style={[styles.entry, digits.length > 0 && styles.entryFocused]}>
            <Text style={styles.country}>🇮🇳 +91</Text>
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

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <View style={styles.reassure}>
              <Text style={styles.lock}>􀎡</Text>
              <Small style={styles.reassureText}>
                Your number is used to sign you in and to let the driver reach you. Nothing else.
              </Small>
            </View>
          )}
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
  body: { flex: 1, paddingHorizontal: s(18), paddingTop: s(20), gap: s(22) },
  intro: { gap: s(7) },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(11),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    paddingHorizontal: s(14),
    paddingVertical: s(13),
    borderWidth: 1,
    borderColor: color.line,
  },
  entryFocused: { borderWidth: 2, borderColor: color.blue },
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
  reassure: { flexDirection: 'row', gap: s(9), alignItems: 'flex-start' },
  reassureText: { flex: 1 },
  lock: { fontSize: f(13), color: color.dim, marginTop: f(1) },
  error: { fontSize: f(13), color: color.red, lineHeight: f(19) },
  legal: { textAlign: 'center', marginTop: s(12) },
});
