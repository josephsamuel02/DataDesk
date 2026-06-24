import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text } from 'react-native';
import { THEME } from '../constants/theme';

const ICON = require('../assets/icon.png');

interface SplashOverlayProps {
  onFinish: () => void;
  /** How long to hold the splash before fading out (ms). */
  duration?: number;
}

/**
 * A lightweight in-app splash that shows on every launch/reload. The native
 * splash (expo-splash-screen) only shows on a cold start of a built app, so
 * this guarantees consistent branding during development and JS reloads too.
 */
export function SplashOverlay({ onFinish, duration = 1500 }: SplashOverlayProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onFinish, opacity, scale]);

  return (
    <Animated.View style={[styles.fill, { opacity }]}>
      <Animated.View style={[styles.center, { transform: [{ scale }] }]}>
        <Image source={ICON} style={styles.icon} resizeMode="contain" />
        <Text style={styles.name}>Data Desk</Text>
        <Text style={styles.tagline}>Your Data, Your Way</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  center: {
    alignItems: 'center',
  },
  icon: {
    width: 150,
    height: 150,
    borderRadius: 34,
  },
  name: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.primary,
    marginTop: 12,
  },
  tagline: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 6,
  },
});
