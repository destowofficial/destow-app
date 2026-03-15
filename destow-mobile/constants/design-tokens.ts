/**
 * Centralized design tokens for the Destow mobile app.
 * Keeps spacing, radii, shadows, and typography consistent across all screens.
 */
import { Platform, ViewStyle, TextStyle } from 'react-native';

// ─── Colors (same as existing theme, centralized for reference) ─────────────
export const AppColors = {
  /** Main background */
  background: '#FFFFFF',
  /** Primary accent – light blue */
  accent: '#A0D2E7',
  /** Secondary accent – lighter blue */
  accentLight: '#D1E8F5',
  /** Accent button shade */
  accentButton: '#A6D4EA',
  /** Dark brand color – logo, primary text, CTA buttons */
  brand: '#1A1D20',
  /** Secondary (muted) text */
  textMuted: '#8A8D91',
  /** Input placeholder */
  placeholder: '#9A9FA5',
  /** Input field background */
  inputBg: '#EEF1F4',
  /** Card / detail-block background */
  cardBg: '#A0D2E7',
  cardBgLight: '#D1E8F5',
  /** Borders & dividers */
  border: '#E8EBED',
  /** Tab bar inactive */
  tabInactive: '#A0A4A8',
};

// ─── Spacing ────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── Border Radii ───────────────────────────────────────────────────────────
export const Radii = {
  /** Inputs & text-fields */
  input: 16,
  /** Primary action buttons (pill) */
  button: 28,
  /** Cards & containers */
  card: 22,
  /** Logo square */
  logo: 22,
  /** Small badges / chips */
  chip: 20,
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────
export const Shadows: Record<string, ViewStyle> = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }) as ViewStyle,

  button: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }) as ViewStyle,

  subtle: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }) as ViewStyle,
};

// ─── Typography ─────────────────────────────────────────────────────────────
export const Typography: Record<string, TextStyle> = {
  /** Screen title – 32px bold */
  screenTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: AppColors.brand,
    letterSpacing: -0.5,
  },
  /** Section heading – 20px bold */
  sectionHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.brand,
  },
  /** Body text – 16px */
  body: {
    fontSize: 16,
    color: AppColors.brand,
  },
  /** Input label – 12px uppercase */
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  /** Button text – 16px semi-bold */
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  /** Small / caption */
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.textMuted,
  },
};

// ─── Common Styles ──────────────────────────────────────────────────────────
export const CommonStyles = {
  /** Standardized input field */
  input: {
    backgroundColor: AppColors.inputBg,
    borderRadius: Radii.input,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: AppColors.brand,
    fontWeight: '500' as const,
  },
  /** Primary dark button (pill) */
  primaryButton: {
    backgroundColor: AppColors.brand,
    borderRadius: Radii.button,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center' as const,
    ...Shadows.button,
  },
  /** Accent button (pill) */
  accentButton: {
    backgroundColor: AppColors.accentButton,
    borderRadius: Radii.button,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center' as const,
    ...Shadows.button,
  },
};
