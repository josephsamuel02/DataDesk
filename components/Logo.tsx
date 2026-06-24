import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

const ICON = require('../assets/icon.png');

interface LogoProps {
  size?: number;
  /**
   * 'light' wraps the icon in a white rounded tile so it stays visible on dark
   * backgrounds. 'color' renders the icon as-is (for light backgrounds).
   */
  variant?: 'color' | 'light';
}

/** Data Desk brand mark — uses the app icon asset. */
export function Logo({ size = 28, variant = 'color' }: LogoProps) {
  if (variant === 'light') {
    return (
      <View
        style={[
          styles.lightTile,
          { width: size, height: size, borderRadius: size * 0.28 },
        ]}
      >
        <Image
          source={ICON}
          style={{ width: size * 0.82, height: size * 0.82, borderRadius: size * 0.2 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <Image
      source={ICON}
      style={{ width: size, height: size, borderRadius: size * 0.24 }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  lightTile: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
