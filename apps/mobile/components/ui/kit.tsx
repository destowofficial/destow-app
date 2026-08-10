import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, shadow, weight } from '../../theme/tokens';
import { f, s, isTablet, layoutWidth } from '../../theme/responsive';

// The pieces every screen is assembled from. Kept in one file because they are
// small and always used together, and because a screen reading top to bottom is
// easier to follow than one importing eleven things.

// --- Layout ------------------------------------------------------------------

/**
 * A screen. Handles the notch, the ground colour, and - on a tablet - caps the
 * content to a phone-width column rather than stretching a phone layout across
 * ten inches.
 */
export function Screen({
  children,
  scroll,
  ground = color.bg,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  ground?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <View style={[styles.column, isTablet && styles.columnTablet, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: ground }]} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

/** The bottom action area. Lifts clear of the home indicator on gesture phones. */
export function Footer({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, s(16)) + s(6) }]}>
      {children}
    </View>
  );
}

/** A top bar: back chevron, title, and nothing on the right unless given. */
export function Header({
  title,
  onBack,
  right,
  onTint,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  onTint?: boolean;
}) {
  const tint = onTint ? color.white : color.ink;
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={[styles.chevBack, { color: tint }]}>‹</Text>
        </Pressable>
      ) : (
        <View style={{ width: s(20) }} />
      )}
      {title ? <Text style={[styles.headerTitle, { color: tint }]}>{title}</Text> : <View />}
      <View style={styles.headerRight}>{right ?? <View style={{ width: s(20) }} />}</View>
    </View>
  );
}

/** The blue hero the tab screens open with. */
export function Hero({ children }: { children: React.ReactNode }) {
  return <View style={styles.hero}>{children}</View>;
}

// --- Type --------------------------------------------------------------------

export const H1 = (p: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.h1, p.style]}>{p.children}</Text>
);
export const H2 = (p: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.h2, p.style]}>{p.children}</Text>
);
export const H3 = (p: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.h3, p.style]}>{p.children}</Text>
);
export const P = (p: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.p, p.style]}>{p.children}</Text>
);
export const Small = (p: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  // A place returned by the maps provider can carry a long tail of district and
  // state; one line of it is enough beside the name.
  numberOfLines?: number;
}) => (
  <Text style={[styles.small, p.style]} numberOfLines={p.numberOfLines}>
    {p.children}
  </Text>
);
/** The uppercase micro-label above a value. */
export const Label = (p: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.label, p.style]}>{p.children}</Text>
);
/** A money or distance figure. Tabular so columns of digits line up. */
export const Amount = (p: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.amount, p.style]}>{p.children}</Text>
);

// --- Surfaces ----------------------------------------------------------------

export function Card({
  children,
  lift,
  selected,
  onPress,
  style,
  tone,
}: {
  children: React.ReactNode;
  lift?: boolean;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: 'ok' | 'warn' | 'blue' | 'red';
}) {
  const toneStyle =
    tone === 'ok'
      ? { backgroundColor: color.okWash, borderColor: color.okBorder, borderWidth: 1 }
      : tone === 'warn'
        ? { backgroundColor: color.warnWash, borderColor: color.warnBorder, borderWidth: 1 }
        : tone === 'blue'
          ? { backgroundColor: color.blueWash, borderColor: color.blueBorder, borderWidth: 1 }
          : tone === 'red'
            ? { backgroundColor: color.redWash, borderColor: color.redBorder, borderWidth: 1 }
            : null;

  const body = (
    <View
      style={[
        styles.card,
        lift ? shadow.md : tone ? null : shadow.sm,
        toneStyle,
        selected && styles.cardSelected,
        style,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => <View style={pressed && styles.pressed}>{body}</View>}
    </Pressable>
  ) : (
    body
  );
}

export const Row = (p: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.row, p.style]}>{p.children}</View>
);
export const Divider = (p: { style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.divider, p.style]} />
);

// --- Controls ----------------------------------------------------------------

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'danger' && styles.buttonDanger,
        variant === 'ghost' && styles.buttonGhost,
        variant !== 'ghost' && shadow.blue,
        variant === 'danger' && { shadowColor: color.red },
        off && styles.buttonOff,
        pressed && !off && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? color.sub : color.white} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'ghost' && { color: color.ink },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'blue',
}: {
  label: string;
  tone?: 'ok' | 'warn' | 'red' | 'blue';
}) {
  const map = {
    ok: [color.okWash, color.ok, color.okBorder],
    warn: [color.warnWash, color.warn, color.warnBorder],
    red: [color.redWash, color.red, color.redBorder],
    blue: [color.blueWash, color.blueDark, color.blueBorder],
  } as const;
  const [bg, fg, border] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** A rounded icon plate. Takes a glyph rather than an icon set, for now. */
export function Plate({
  glyph,
  tone = 'blue',
}: {
  glyph: string;
  tone?: 'blue' | 'ok' | 'neutral' | 'red';
}) {
  const map = {
    blue: [color.blueWash, color.blue],
    ok: [color.okWash, color.ok],
    neutral: ['#f2f4f7', color.sub],
    red: [color.redWash, color.red],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.plate, { backgroundColor: bg }]}>
      <Text style={[styles.plateGlyph, { color: fg }]}>{glyph}</Text>
    </View>
  );
}

/** Read-only field presentation: a label above a value, on a card ground. */
export function Field({
  label,
  value,
  placeholder,
  focused,
  onPress,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  focused?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <Label>{label}</Label>
      <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]}>
        {value || placeholder}
      </Text>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function Chips({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// --- States ------------------------------------------------------------------

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.centre}>
      <ActivityIndicator color={color.blue} size="large" />
      {label ? <P style={{ marginTop: s(12) }}>{label}</P> : null}
    </View>
  );
}

/**
 * Something went wrong, said usefully. A dropped connection is offered a retry;
 * a server refusal explains itself instead.
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.centre}>
      <Plate glyph="!" tone="red" />
      <P style={{ marginTop: s(12), textAlign: 'center' }}>{message}</P>
      {onRetry ? (
        <Button label="Try again" variant="ghost" onPress={onRetry} style={{ marginTop: s(16) }} />
      ) : null}
    </View>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.centre}>
      <H3>{title}</H3>
      {body ? <P style={{ marginTop: s(6), textAlign: 'center' }}>{body}</P> : null}
    </View>
  );
}

// Typed explicitly: the sheet mixes view and text styles, and without this the
// inferred union makes every `style={styles.x}` an error at the call site.
type Kit = {
  screen: ViewStyle;
  column: ViewStyle;
  columnTablet: ViewStyle;
  scrollBody: ViewStyle;
  header: ViewStyle;
  headerRight: ViewStyle;
  hero: ViewStyle;
  card: ViewStyle;
  cardSelected: ViewStyle;
  pressed: ViewStyle;
  row: ViewStyle;
  divider: ViewStyle;
  footer: ViewStyle;
  button: ViewStyle;
  buttonPrimary: ViewStyle;
  buttonDanger: ViewStyle;
  buttonGhost: ViewStyle;
  buttonOff: ViewStyle;
  badge: ViewStyle;
  plate: ViewStyle;
  field: ViewStyle;
  fieldFocused: ViewStyle;
  chips: ViewStyle;
  chip: ViewStyle;
  chipOn: ViewStyle;
  centre: ViewStyle;
  headerTitle: TextStyle;
  chevBack: TextStyle;
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  p: TextStyle;
  small: TextStyle;
  label: TextStyle;
  amount: TextStyle;
  buttonLabel: TextStyle;
  badgeText: TextStyle;
  plateGlyph: TextStyle;
  fieldValue: TextStyle;
  fieldPlaceholder: TextStyle;
  chipText: TextStyle;
  chipTextOn: TextStyle;
};

const styles = StyleSheet.create<Kit>({
  screen: { flex: 1 },
  column: { flex: 1, width: '100%', alignSelf: 'center' },
  columnTablet: { maxWidth: layoutWidth },
  scrollBody: { flexGrow: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(18),
    paddingTop: s(2),
    paddingBottom: s(14),
  },
  headerTitle: { fontSize: f(15), fontWeight: weight.bold, letterSpacing: -0.2 },
  headerRight: { minWidth: s(20), alignItems: 'flex-end' },
  chevBack: { fontSize: f(30), lineHeight: f(30), fontWeight: weight.medium, marginTop: -f(4) },

  hero: { backgroundColor: color.blue, paddingHorizontal: s(18), paddingBottom: s(22) },

  h1: { fontSize: f(25), fontWeight: weight.heavy, color: color.ink, letterSpacing: -0.8, lineHeight: f(29) },
  h2: { fontSize: f(18), fontWeight: weight.heavy, color: color.ink, letterSpacing: -0.4 },
  h3: { fontSize: f(15), fontWeight: weight.bold, color: color.ink, letterSpacing: -0.2 },
  p: { fontSize: f(13), color: color.sub, lineHeight: f(19) },
  small: { fontSize: f(11.5), color: color.dim, lineHeight: f(16) },
  label: {
    fontSize: f(10.5),
    fontWeight: weight.heavy,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: color.dim,
  },
  amount: {
    fontSize: f(24),
    fontWeight: weight.black,
    color: color.ink,
    letterSpacing: -0.9,
    fontVariant: ['tabular-nums'],
  },

  card: { backgroundColor: color.card, borderRadius: radius.xl, padding: s(15) },
  cardSelected: { borderWidth: 2, borderColor: color.blue },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s(10) },
  divider: { height: 1, backgroundColor: color.line },

  footer: { paddingHorizontal: s(18), paddingTop: s(12) },
  button: {
    height: s(48),
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: s(8),
  },
  buttonPrimary: { backgroundColor: color.blue },
  buttonDanger: { backgroundColor: color.red },
  buttonGhost: { backgroundColor: color.card, borderWidth: 1, borderColor: color.line },
  buttonOff: { opacity: 0.45 },
  buttonLabel: { color: color.white, fontSize: f(15), fontWeight: weight.bold, letterSpacing: -0.2 },

  badge: { paddingHorizontal: s(9), paddingVertical: s(3), borderRadius: radius.pill, borderWidth: 1 },
  badgeText: { fontSize: f(10.5), fontWeight: weight.bold },

  plate: { width: s(36), height: s(36), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  plateGlyph: { fontSize: f(17), fontWeight: weight.heavy },

  field: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    paddingHorizontal: s(14),
    paddingVertical: s(11),
    borderWidth: 1,
    borderColor: color.line,
    gap: s(2),
  },
  fieldFocused: { borderWidth: 2, borderColor: color.blue },
  fieldValue: { fontSize: f(15), fontWeight: weight.semi, color: color.ink, letterSpacing: -0.2 },
  fieldPlaceholder: { color: color.dim, fontWeight: weight.medium },

  chips: { flexDirection: 'row', gap: s(7), flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: s(13),
    paddingVertical: s(7),
    borderRadius: radius.pill,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
  },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
  chipText: { fontSize: f(12), fontWeight: weight.semi, color: color.sub },
  chipTextOn: { color: color.white },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: s(24) },
});
