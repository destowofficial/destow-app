import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './ui/kit';
import { color, radius, weight } from '../theme/tokens';
import { f, s } from '../theme/responsive';

// Asking before something irreversible, in the app's own voice.
//
// Replaces the native alert for two reasons: a system dialog is drawn by the OS
// and looks like it belongs to a different product, and it renders differently
// on every Android skin - so the one moment we most need to be understood is
// the one we have least control over.
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  destructive,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <Pressable style={styles.dismiss} onPress={onCancel} accessibilityLabel="Cancel" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + s(14) }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              loading={busy}
              variant={destructive ? 'danger' : 'primary'}
            />
            <Button label="Cancel" variant="ghost" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(16,24,40,0.45)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: s(8),
    paddingHorizontal: s(18),
  },
  grabber: {
    width: s(38),
    height: s(4),
    borderRadius: 999,
    backgroundColor: color.line,
    alignSelf: 'center',
    marginBottom: s(16),
  },
  title: { fontSize: f(18), fontWeight: weight.black, color: color.ink, letterSpacing: -0.4 },
  body: { fontSize: f(14), color: color.sub, lineHeight: f(21), marginTop: s(6) },
  actions: { marginTop: s(20), gap: s(8) },
});
