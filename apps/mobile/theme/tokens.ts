// The design tokens the screens are drawn from.
//
// Sampled from the mark in apps/web/public/destow-*.png rather than taken from
// the older palette: the wordmark is a flat, fully saturated #0051fb, which is a
// noticeably louder blue than the #2563eb the app used to carry, and it is never
// a gradient. The blue is loud, so it punctuates and never fills.
//
// Neutrals are pulled toward the charcoal in the mark rather than being neutral
// grey, so they read as chosen against the accent.
export const color = {
  blue: '#0051fb',
  blueDark: '#0040cc',
  blueWash: '#eaf0ff',
  blueBorder: '#c7d8ff',

  ink: '#101828',
  sub: '#667085',
  dim: '#98a2b3',

  line: '#eaecf0',
  bg: '#f7f8fa',
  card: '#ffffff',
  white: '#ffffff',

  ok: '#039855',
  okWash: '#ecfdf3',
  okBorder: '#abefc6',

  warn: '#b54708',
  warnWash: '#fffaeb',
  warnBorder: '#fedf89',

  red: '#d92d20',
  redWash: '#fef3f2',
  redBorder: '#fecdca',

  star: '#f79009',
  // Device chrome in the mockups; used for the dark splash ground.
  night: '#10151d',
} as const;

// Elevation, not borders. The screens layer cards over a tinted ground rather
// than outlining everything, which is what stops them reading as a wireframe.
export const shadow = {
  sm: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  // A button in the brand blue carries its own colour into the shadow.
  blue: {
    shadowColor: color.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
} as const;

export const radius = {
  sm: 8,
  md: 11,
  lg: 13,
  xl: 16,
  xxl: 22,
  pill: 999,
} as const;

// React Native only accepts the standard hundreds, so the artifact's 650/750 are
// mapped onto the nearest real weights. The heavy end matters: fare figures are
// set at 800, which is what makes them read as the point of the screen rather
// than another line of text.
export const weight = {
  regular: '400',
  medium: '500',
  semi: '600',
  bold: '700',
  heavy: '700',
  black: '800',
} as const;
