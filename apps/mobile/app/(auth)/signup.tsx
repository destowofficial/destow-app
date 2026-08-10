import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Footer, H1, P, Row, Screen, Small } from '../../components/ui/kit';
import { color, radius, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { updateMe } from '../../services/destow';
import { ApiError, NetworkError } from '../../services/http';
import { useAuthStore } from '../../stores/useAuthStore';

// Shown once, to new accounts only. Name is required because a driver has to
// ask for someone at pickup; email is not.
export default function Signup() {
  const user = useAuthStore((st) => st.user);
  const setUser = useAuthStore((st) => st.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setEmailError(null);
    try {
      const updated = await updateMe({
        name: name.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      setUser(updated);
      // The root layout routes on `user.name`, so setting it is the navigation.
    } catch (e) {
      if (e instanceof NetworkError) setError('No connection. Check your network and try again.');
      else if (e instanceof ApiError) {
        // An address already in use is a 409, and saying so beats a generic
        // failure the customer cannot act on.
        setEmailError(e.fieldError('email') ?? (e.status === 409 ? e.error : null));
        if (!e.details?.email && e.status !== 409) setError(e.error);
      } else setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const pretty = user?.phone ?? '';

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <View style={styles.intro}>
            <H1>Almost there</H1>
            <P style={{ fontSize: f(14) }}>Your driver will ask for you by name at pickup.</P>
          </View>

          <View style={styles.fields}>
            <View style={[styles.field, name.length > 0 && styles.fieldOn]}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={color.dim}
                style={styles.input}
                autoCapitalize="words"
                textContentType="name"
                autoFocus
                accessibilityLabel="Full name"
              />
            </View>

            <View style={[styles.field, !!emailError && styles.fieldBad]}>
              <Text style={styles.label}>Email — optional, for receipts</Text>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setEmailError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={color.dim}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                accessibilityLabel="Email"
              />
            </View>
            {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
          </View>

          <Card style={styles.verified}>
            <Row style={{ justifyContent: 'flex-start', gap: s(11) }}>
              <View style={styles.tick}>
                <Text style={styles.tickGlyph}>✓</Text>
              </View>
              <View>
                <Text style={styles.phone}>{pretty}</Text>
                <Small>Verified just now</Small>
              </View>
            </Row>
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Footer>
          <Button
            label="Start booking"
            onPress={save}
            loading={busy}
            disabled={name.trim().length < 2}
          />
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: s(18), paddingTop: s(26), gap: s(20) },
  intro: { gap: s(7) },
  fields: { gap: s(11) },
  field: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    borderWidth: 1,
    borderColor: color.line,
    gap: s(2),
  },
  fieldOn: { borderColor: color.line },
  fieldBad: { borderWidth: 2, borderColor: color.red },
  label: {
    fontSize: f(10.5),
    fontWeight: weight.bold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: color.dim,
  },
  input: { fontSize: f(15), fontWeight: weight.semi, color: color.ink, padding: 0 },
  verified: { padding: s(13) },
  tick: {
    width: s(32),
    height: s(32),
    borderRadius: 999,
    backgroundColor: color.okWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickGlyph: { color: color.ok, fontSize: f(15), fontWeight: weight.bold },
  phone: { fontSize: f(13.5), fontWeight: weight.semi, color: color.ink },
  error: { fontSize: f(13), color: color.red, lineHeight: f(19) },
});
