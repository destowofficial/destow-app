import { Platform } from 'react-native';

const fontFamily = Platform.OS === 'ios' ? 'Inter' : 'Inter';

export const typography = {
  fontFamily,
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    hero: 32,
    display: 40,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const textStyles = {
  hero: {
    fontSize: typography.sizes.hero,
    fontFamily: `${fontFamily}_700Bold`,
    lineHeight: typography.sizes.hero * typography.lineHeights.tight,
  },
  h1: {
    fontSize: typography.sizes.xxl,
    fontFamily: `${fontFamily}_700Bold`,
    lineHeight: typography.sizes.xxl * typography.lineHeights.normal,
  },
  h2: {
    fontSize: typography.sizes.xl,
    fontFamily: `${fontFamily}_600SemiBold`,
    lineHeight: typography.sizes.xl * typography.lineHeights.normal,
  },
  h3: {
    fontSize: typography.sizes.lg,
    fontFamily: `${fontFamily}_600SemiBold`,
    lineHeight: typography.sizes.lg * typography.lineHeights.normal,
  },
  body: {
    fontSize: typography.sizes.md,
    fontFamily: `${fontFamily}_400Regular`,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  bodyMedium: {
    fontSize: typography.sizes.md,
    fontFamily: `${fontFamily}_500Medium`,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  caption: {
    fontSize: typography.sizes.sm,
    fontFamily: `${fontFamily}_400Regular`,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  captionMedium: {
    fontSize: typography.sizes.sm,
    fontFamily: `${fontFamily}_500Medium`,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  label: {
    fontSize: typography.sizes.base,
    fontFamily: `${fontFamily}_500Medium`,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  small: {
    fontSize: typography.sizes.xs,
    fontFamily: `${fontFamily}_400Regular`,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
  },
};
