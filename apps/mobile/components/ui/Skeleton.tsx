import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { color, radius, shadow } from '../../theme/tokens';
import { s } from '../../theme/responsive';

// Placeholders shaped like the thing that is coming.
//
// A centred spinner tells you to wait; a skeleton tells you what for, and the
// screen does not jump when the data lands because the layout is already the
// right height. On a slow connection that is the difference between the app
// feeling broken and feeling busy.

function usePulse(): Animated.Value {
  const value = useRef(new Animated.Value(0.5)).current;
  const [still, setStill] = useState(false);

  // Someone who has asked the OS to reduce motion should not be shown a
  // breathing rectangle. They get a flat one.
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => alive && setStill(on));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (still) {
      value.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [still, value]);

  return value;
}

/** A single bar. Width takes a number or a percentage string. */
export function Bar({
  w = '100%',
  h = 12,
  style,
}: {
  w?: number | `${number}%`;
  h?: number;
  style?: ViewStyle;
}) {
  const pulse = usePulse();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.bar,
        { width: w, height: s(h), borderRadius: s(h) / 2, opacity: pulse },
        style,
      ]}
    />
  );
}

/** A card-shaped placeholder for the list rows used across the app. */
export function RowSkeleton({ tall }: { tall?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <Bar w="55%" h={14} />
        <Bar w={s(64)} h={18} />
      </View>
      <View style={styles.rowBottom}>
        <Bar w="40%" h={10} />
        <Bar w={s(72)} h={16} />
      </View>
      {tall ? <Bar w="100%" h={36} style={{ marginTop: s(11), borderRadius: radius.md }} /> : null}
    </View>
  );
}

/** Several rows, for a list that is still loading. */
export function ListSkeleton({ rows = 3, tall }: { rows?: number; tall?: boolean }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, i) => (
        <RowSkeleton key={i} tall={tall && i === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#e7eaf0' },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.xl,
    padding: s(15),
    gap: s(9),
    ...shadow.sm,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { paddingHorizontal: s(18), gap: s(11) },
});
