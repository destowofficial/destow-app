import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Badge, Button, Card, Empty, ErrorState, Footer, PageHead, Row, Screen, Small,
} from '../components/ui/kit';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { Icon } from '../components/ui/Icon';
import { ListSkeleton } from '../components/ui/Skeleton';
import { color, radius, weight } from '../theme/tokens';
import { f, s } from '../theme/responsive';
import { listSessions, signOutEverywhere } from '../services/destow';
import { useAsync } from '../hooks/useAsync';
import { dayDate } from '../lib/format';
import { useAuthStore } from '../stores/useAuthStore';

// The account-recovery story for a phone-number login. If a number is ported or
// a handset is lost, this is the only lever a customer has.
export default function Devices() {
  const sessions = useAsync(listSessions, []);
  const setUser = useAuthStore((st) => st.setUser);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function signOutAll() {
    setBusy(true);
    await signOutEverywhere();
    setUser(null);
  }

  return (
    <Screen ground={color.blue}>
      <PageHead
        title="Signed-in devices"
        subtitle="Sign out of anything you don't recognise. Your trips are never lost."
        onBack={() => router.back()}
      />
      <View style={styles.sheet}>

      {sessions.loading && !sessions.data ? (
        <ListSkeleton rows={3} />
      ) : sessions.error ? (
        <ErrorState message={sessions.error} onRetry={sessions.reload} />
      ) : (sessions.data?.length ?? 0) === 0 ? (
        <Empty title="Just this device" />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {sessions.data!.map((sn) => (
            <Card key={sn.id} selected={sn.current} style={styles.row}>
              <Row>
                <View style={styles.plate}>
                  <Icon name="device" size={18} color={sn.current ? color.blue : color.sub} />
                </View>
                <View style={styles.text}>
                  <Text style={styles.name}>{sn.deviceName ?? sn.platform ?? 'Unknown device'}</Text>
                  <Small>
                    {sn.lastUsedAt ? `Last used ${dayDate(sn.lastUsedAt)}` : `Signed in ${dayDate(sn.createdAt)}`}
                  </Small>
                </View>
                {sn.current ? <Badge label="This device" tone="ok" /> : null}
              </Row>
            </Card>
          ))}
        </ScrollView>
      )}

      </View>

      <Footer>
        <Button
          label="Sign out everywhere"
          variant="ghost"
          loading={busy}
          onPress={() => setConfirming(true)}
        />
      </Footer>

      <ConfirmSheet
        open={confirming}
        title="Sign out everywhere?"
        body="Every signed-in device is signed out, including this one."
        confirmLabel="Sign out everywhere"
        destructive
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={signOutAll}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: color.bg, paddingTop: s(14) },
  list: { paddingHorizontal: s(18), paddingBottom: s(24), gap: s(10) },
  row: { padding: s(13) },
  text: { flex: 1 },
  name: { fontSize: f(14), fontWeight: weight.semi, color: color.ink },
  plate: { width: s(36), height: s(36), borderRadius: radius.md, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' },
});
