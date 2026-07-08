import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAppStore } from '../../stores/useAppStore';

export default function Splash() {
  const router = useRouter();
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const scaleAnim = React.useRef(new Animated.Value(0.5)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const taglineOpacity = React.useRef(new Animated.Value(0)).current;
  const dot1Scale = React.useRef(new Animated.Value(1)).current;
  const dot2Scale = React.useRef(new Animated.Value(1)).current;
  const dot3Scale = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SplashScreen.hideAsync();

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(taglineOpacity, {
      toValue: 1,
      delay: 600,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const pulseDots = () => {
      const createPulse = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1.3, duration: 400, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          ])
        );
      createPulse(dot1Scale, 0).start();
      createPulse(dot2Scale, 200).start();
      createPulse(dot3Scale, 400).start();
    };
    const pulseTimer = setTimeout(pulseDots, 1200);

    const navigateTimer = setTimeout(() => {
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/onboarding');
      }
    }, 2500);

    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(navigateTimer);
    };
  }, []);

  return (
    <LinearGradient
      colors={colors.primary.gradient as any}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Your Journey. Our Commitment.
        </Animated.Text>
      </View>
      <Animated.View style={styles.dots}>
        <Animated.View style={[styles.dot, { transform: [{ scale: dot1Scale }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ scale: dot2Scale }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ scale: dot3Scale }] }]} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 30,
  },
  tagline: {
    fontSize: typography.sizes.lg,
    fontFamily: `${typography.fontFamily}_300Light`,
    color: 'rgba(255,255,255,0.9)',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
});
