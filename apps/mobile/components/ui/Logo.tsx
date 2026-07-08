import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface LogoProps {
  size?: number;
  style?: any;
}

export function Logo({ size = 80, style }: LogoProps) {
  return (
    <Image
      source={require('../assets/logo.png')}
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
      resizeMode="contain"
    />
  );
}
