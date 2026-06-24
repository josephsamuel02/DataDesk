import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from './Logo';
import { THEME } from '../constants/theme';

interface AuthHeroProps {
  title: string;
  subtitle: string;
}

/** Navy, edge-to-edge curved header used across the auth screens. */
export function AuthHero({ title, subtitle }: AuthHeroProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
      <View style={styles.decorLg} pointerEvents="none" />
      <View style={styles.decorSm} pointerEvents="none" />

      <View style={styles.brandRow}>
        <Logo size={40} variant="light" />
        <Text style={styles.brand}>Data Desk</Text>
      </View>
      <Text style={styles.tagline}>Your Data, Your Way</Text>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 56,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    ...THEME.shadow.large,
  },
  decorLg: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorSm: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: THEME.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
    marginTop: 22,
  },
  subtitle: {
    fontSize: THEME.fontSize.base,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginTop: 6,
  },
});
