export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e3a8a',
    900: '#1e3a8a',
    gradient: ['#1e3a8a', '#2563eb', '#3b82f6'] as const,
    gradientStart: '#2563eb',
    gradientEnd: '#3b82f6',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    gradientStart: '#10b981',
    gradientEnd: '#059669',
  },
  warning: {
    50: '#fff7ed',
    500: '#f97316',
    600: '#ea580c',
  },
  danger: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
  },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  white: '#ffffff',
  black: '#000000',
  purple: {
    50: '#faf5ff',
    500: '#a855f7',
    600: '#9333ea',
  },
} as const;

export type ColorScheme = {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
};

export const lightTheme: ColorScheme = {
  background: colors.neutral[50],
  surface: colors.white,
  surfaceElevated: colors.white,
  text: colors.neutral[900],
  textSecondary: colors.neutral[600],
  textMuted: colors.neutral[500],
  border: colors.neutral[200],
  borderLight: colors.neutral[100],
};

export const darkTheme: ColorScheme = {
  background: colors.neutral[900],
  surface: colors.neutral[800],
  surfaceElevated: colors.neutral[700],
  text: colors.neutral[50],
  textSecondary: colors.neutral[300],
  textMuted: colors.neutral[400],
  border: colors.neutral[700],
  borderLight: colors.neutral[800],
};
