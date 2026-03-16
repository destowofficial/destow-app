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
  accent: '#E6F4F1',
  /** Secondary accent – lighter blue */
  accentLight: '#F2F9F8',
  /** Accent button shade */
  accentButton: '#13949D',
  /** Dark brand color – logo, primary text, CTA buttons */
  brand: '#0E8A93', // Teal color
  /** Secondary (muted) text */
  textMuted: '#6B7280',
  /** Input placeholder */
  placeholder: '#9CA3AF',
  /** Input field background */
  inputBg: '#FFFFFF',
  /** Card / detail-block background */
  cardBg: '#FFFFFF',
  cardBgLight: '#F9FAFB',
  /** Borders & dividers */
  border: '#E5E7EB',
  /** Tab bar inactive */
  tabInactive: '#9CA3AF',
  /** Error text color */
  error: '#DC2626',
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
    borderWidth: 1,
    borderColor: AppColors.brand,
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
