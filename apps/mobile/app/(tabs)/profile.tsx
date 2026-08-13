import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Label, Screen, Small } from '../../components/ui/kit';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Icon, type IconName } from '../../components/ui/Icon';
import { color, radius, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { config } from '../../constants/config';
import { useAuthStore } from '../../stores/useAuthStore';

// A menu, not a destination. Everything under it is one tap deep.
//
// Grouped lists rather than a card per row: a card carries a border and a
// shadow, so a stack of them reads as eight floating objects instead of one
// list. The dividers are inset to the label, which is what makes a grouped
// list scan as a group.
export default function Profile() {
  const user = useAuthStore((st) => st.user);
  const signOut = useAuthStore((st) => st.signOut);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doSignOut() {
    setBusy(true);
    // The root layout routes on `user`, so clearing it is the navigation.
    await signOut();
  }

  return (
    <Screen ground={color.blue}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.name)}</Text>
        </View>
        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.name ?? 'Your account'}
          </Text>
          <Text style={styles.phone}>{user?.phone ?? ''}</Text>
        </View>
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Label style={styles.groupLabel}>Account</Label>
          <Card lift style={styles.group}>
            <Item icon="user" label="Edit profile" onPress={() => router.push('/(auth)/signup')} />
            <Rule />
            <Item icon="device" label="Signed-in devices" onPress={() => router.push('/devices')} />
          </Card>

          <Label style={styles.groupLabel}>Support</Label>
          <Card lift style={styles.group}>
            <Item icon="help" label="Help and support" onPress={() => router.push('/help')} />
            <Rule />
            <Item icon="pin" label="Photo credits" onPress={() => router.push('/photo-credits')} />
          </Card>

          <Card style={[styles.group, styles.out]}>
            <Item
              icon="signOut"
              label="Sign out"
              tone="red"
              onPress={busy ? undefined : () => setConfirming(true)}
            />
          </Card>

          <Small style={styles.version}>destow · version {config.appVersion}</Small>
        </ScrollView>
      </View>

      <ConfirmSheet
        open={confirming}
        title="Sign out?"
        body="Your trips stay on your account. You'll need your number and a code to get back in."
        confirmLabel="Sign out"
        destructive
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={doSignOut}
      />
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
  const red = tone === 'red';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.plate, red && styles.plateRed]}>
        <Icon name={icon} size={17} color={red ? color.red : color.sub} />
      </View>
      <Text style={[styles.itemLabel, red && styles.itemLabelRed]}>{label}</Text>
      {red ? null : <Icon name="forward" size={16} color={color.dim} />}
    </Pressable>
  );
}

/** Inset to the label, so the group reads as one object rather than slices. */
const Rule = () => <View style={styles.rule} />;

function initials(name?: string | null): string {
  if (!name) return '·';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const styles = StyleSheet.create({
  head: {
    backgroundColor: color.blue,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    paddingHorizontal: s(18),
    paddingTop: s(6),
    paddingBottom: s(20),
  },
  avatar: {
    width: s(54),
    height: s(54),
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: color.white, fontSize: f(19), fontWeight: weight.black, letterSpacing: 0.4 },
  who: { flex: 1, gap: s(2) },
  name: { color: color.white, fontSize: f(20), fontWeight: weight.black, letterSpacing: -0.5 },
  phone: { color: 'rgba(255,255,255,0.82)', fontSize: f(13.5), fontVariant: ['tabular-nums'] },

  sheet: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: s(18), paddingTop: s(14), paddingBottom: s(28) },

  groupLabel: { marginBottom: s(8), marginTop: s(14) },
  group: { padding: 0, overflow: 'hidden' },
  out: { marginTop: s(22) },

  item: { flexDirection: 'row', alignItems: 'center', gap: s(13), padding: s(13) },
  itemPressed: { backgroundColor: color.blueWash },
  plate: {
    width: s(34),
    height: s(34),
    borderRadius: radius.md,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateRed: { backgroundColor: color.redWash },
  itemLabel: { flex: 1, fontSize: f(15), fontWeight: weight.semi, color: color.ink },
  itemLabelRed: { color: color.red, fontWeight: weight.bold },
  rule: { height: 1, backgroundColor: color.line, marginLeft: s(60) },

  version: { textAlign: 'center', marginTop: s(24) },
});
