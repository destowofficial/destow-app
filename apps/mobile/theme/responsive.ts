import { Dimensions, PixelRatio, Platform } from 'react-native';

// Scaling for every phone Destow will actually run on.
//
// The screens were drawn at 390pt - an iPhone 14/15, and close enough to a Pixel
// 7 - so that is the baseline everything is expressed in. The range that has to
// work is roughly 320pt (iPhone SE, Android Go devices) to 430pt (Pro Max), plus
// tablets, where a phone layout stretched edge to edge looks broken.
//
// Two scales rather than one, because space and type do not want the same curve:
// a 320pt phone genuinely has less room, so padding should shrink with it, but
// 11pt text is at the floor of legibility everywhere and must not shrink to 9.

const BASE_WIDTH = 390;
const { width: rawWidth, height: rawHeight } = Dimensions.get('window');

export const screenWidth = rawWidth;
export const screenHeight = rawHeight;

// Above this a phone layout is being stretched rather than filled, so the
// content column is capped and centred instead.
const TABLET_BREAKPOINT = 600;
export const isTablet = rawWidth >= TABLET_BREAKPOINT;

// What the layout should treat as its width. On a tablet that is a comfortable
// phone-ish column; on a phone it is simply the screen.
export const layoutWidth = isTablet ? 460 : rawWidth;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

// Spacing, radii, icon sizes. Follows the width closely but refuses to collapse
// on a small phone or balloon on a large one.
const spaceFactor = clamp(layoutWidth / BASE_WIDTH, 0.86, 1.12);

// Type moves far less. A third of the width delta, so a 320pt phone loses about
// 2% of its font size rather than 18% - the difference between a dense layout
// and an unreadable one.
const typeFactor = clamp(1 + (layoutWidth / BASE_WIDTH - 1) * 0.35, 0.94, 1.06);

/** Scale a spacing or size value from the 390pt baseline. */
export function s(value: number): number {
  return Math.round(value * spaceFactor);
}

/**
 * Scale a font size from the 390pt baseline, snapped to the pixel grid so text
 * does not land on a half pixel and blur.
 */
export function f(value: number): number {
  return PixelRatio.roundToNearestPixel(value * typeFactor);
}

// Short phones - an SE is 667pt tall against a 15 Pro Max's 932 - run out of
// vertical room long before horizontal. Screens that stack a lot of cards use
// this to tighten the gaps rather than pushing the primary action off-screen.
export const isShort = rawHeight < 700;

/** Pick a value by available height: tight layouts on short phones. */
export function byHeight<T>(short: T, tall: T): T {
  return isShort ? short : tall;
}

// The home indicator area on gesture phones, and a sensible floor elsewhere, so
// a primary button never sits flush against the bottom edge.
export const bottomInsetFallback = Platform.select({ ios: 24, default: 16 }) as number;
