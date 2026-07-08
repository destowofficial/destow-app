import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radii, shadows } from '../../theme/spacing';
import { useAppStore } from '../../stores/useAppStore';

const slides = [
  {
    icon: 'map' as const,
    title: 'Travel Anywhere',
    description: 'Book intercity buses and cars across India with just a few taps',
    gradient: [colors.primary[600], colors.primary[700]],
  },
  {
    icon: 'cash' as const,
    title: 'Transparent Pricing',
    description: 'See exactly what you pay with our simple ₹/km pricing model. No hidden charges, ever.',
    gradient: [colors.success[500], colors.success[600]],
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Safe & Reliable',
    description: 'Verified drivers, trusted operators, and 24/7 customer support for peace of mind',
    gradient: [colors.warning[500], colors.warning[600]],
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentSlide((prev) => prev + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setOnboardingComplete();
      router.replace('/(tabs)');
    }
  };

  const handleSkip = () => {
    setOnboardingComplete();
    router.replace('/(tabs)');
  };

  const slide = slides[currentSlide];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.slideContainer, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={slide.gradient as any}
          style={styles.iconCircle}
        >
          <Ionicons name={slide.icon} size={64} color={colors.white} />
        </LinearGradient>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </Animated.View>

      <View style={styles.bottom}>
        <View style={styles.indicators}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentSlide ? styles.activeIndicator : styles.inactiveIndicator,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleNext} activeOpacity={0.8} style={styles.nextButton}>
          <LinearGradient
            colors={[colors.primary[600], colors.primary[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            <Text style={styles.nextText}>
              {currentSlide < slides.length - 1 ? 'Next' : 'Get Started'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.base,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  skipText: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_500Medium`,
    color: colors.neutral[500],
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxxl,
    ...shadows.xl,
  },
  title: {
    fontSize: 30,
    fontFamily: `${typography.fontFamily}_700Bold`,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  description: {
    fontSize: typography.sizes.lg,
    fontFamily: `${typography.fontFamily}_400Regular`,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 28,
  },
  bottom: {
    paddingHorizontal: spacing.base,
    paddingBottom: 48,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.xxxl,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  activeIndicator: {
    width: 32,
    backgroundColor: colors.primary[600],
  },
  inactiveIndicator: {
    width: 8,
    backgroundColor: colors.neutral[300],
  },
  nextButton: {
    borderRadius: radii.lg,
    ...shadows.lg,
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base + 2,
    borderRadius: radii.lg,
    gap: spacing.sm,
  },
  nextText: {
    fontSize: typography.sizes.md,
    fontFamily: `${typography.fontFamily}_600SemiBold`,
    color: colors.white,
  },
});
