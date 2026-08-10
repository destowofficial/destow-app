import React from 'react';
import { Image, type StyleProp, type ImageStyle } from 'react-native';

// The wordmark, from the same file the website and the app icon use, so there is
// one lockup rather than three that drift.
//
// Sized by height: the source is 560 x 189 and the width follows, which keeps it
// from being squashed on a narrow phone or stretched on a wide one.
const SOURCE = require('../../assets/destow-wordmark.png');
const RATIO = 560 / 189;

export function Logo({
  height = 34,
  style,
}: {
  height?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={SOURCE}
      style={[{ height, width: height * RATIO }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Destow"
    />
  );
}
