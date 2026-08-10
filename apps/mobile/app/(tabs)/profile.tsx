import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Divider, H2, Hero, Row, Screen, Small } from '../../components/ui/kit';
import { Icon, type IconName } from '../../components/ui/Icon';
import { color, radius, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { config } from '../../constants/config';
import { useAuthStore } from '../../stores/useAuthStore';

// A menu, not a destination. Everything under it is one tap deep.
export default function Profile() {
  const user = useAuthStore((st) => st.user);
  const signOut = useAuthStore((st) => st.signOut);
  const [busy, setBusy] = useState(false);

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your trips stay on your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          // The root layout routes on `user`, so clearing it is the navigation.
          await signOut();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Hero>
        <Row style={styles.heroRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user?.name)}</Text>
          </View>
          <View>
            <H2 style={styles.name}>{user?.name ?? 'Your account'}</H2>
            <Text style={styles.phone}>{user?.phone ?? ''}</Text>
          </View>
        </Row>
      </Hero>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <Card lift style={styles.menu}>
          <Item
            icon="user"
            label="Edit profile"
            onPress={() => router.push('/(auth)/signup')}
          />
          <Divider style={styles.itemDivider} />
          <Item
            icon="device"
            label="Signed-in devices"
            onPress={() => router.push('/devices')}
          />
          <Divider style={styles.itemDivider} />
          <Item icon="help" label="Help and support" onPress={() => router.push('/help')} />
          <Divider style={styles.itemDivider} />
          <Item
            icon="pin"
            label="Photo credits"
            onPress={() => router.push('/photo-credits')}
          />
        </Card>

        <Card style={styles.menu}>
          <Item
            icon="signOut"
            label="Sign out"
            tone="red"
            onPress={busy ? undefined : confirmSignOut}
          />
        </Card>

        <Small style={styles.version}>
          destow · version {config.appVersion}
        </Small>
      </ScrollView>
    </Screen>
  );
}

function Item({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  tone?: 'red';
}) {
  const tint = tone === 'red' ? color.red : color.sub;
  const bg = tone === 'red' ? color.redWash : '#f2f4f7';
  return (
    <Card onPress={onPress} style={styles.item}>
      <Row>
        <View style={[styles.plate, { backgroundColor: bg }]}>
          <Icon name={icon} size={18} color={tint} />
        </View>
        <Text style={[styles.itemLabel, tone === 'red' && { color: color.red }]}>{label}</Text>
        {tone !== 'red' ? (
          <Icon name="forward" size={16} color={color.dim} />
        ) : null}
      </Row>
    </Card>
  );
}

function initials(name?: string | null): string {
  if (!name) return '·';
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const styles = StyleSheet.create({
  heroRow: { justifyContent: 'flex-start', gap: s(14), paddingTop: s(6), paddingBottom: s(12) },
  avatar: {
    width: s(56),
    height: s(56),
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: color.white, fontSize: f(20), fontWeight: weight.bold },
  name: { color: color.white },
  phone: { color: 'rgba(255,255,255,0.8)', fontSize: f(13) },

  scroll: { flex: 1, marginTop: -s(22) },
  body: { paddingHorizontal: s(18), paddingBottom: s(28), gap: s(13) },
  menu: { padding: 0, overflow: 'hidden', backgroundColor: 'transparent' },
  item: { paddingVertical: s(14), paddingHorizontal: s(15), borderRadius: radius.xl },
  itemDivider: { marginLeft: s(57) },
  itemLabel: { flex: 1, fontSize: f(14), fontWeight: weight.semi, color: color.ink },
  plate: { width: s(36), height: s(36), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  version: { textAlign: 'center', marginTop: s(6) },
});
