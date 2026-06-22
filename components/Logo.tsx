import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

interface LogoProps {
  size?: number;
  /** 'color' = green mark (for white backgrounds), 'light' = white mark (for green backgrounds) */
  variant?: 'color' | 'light';
}

/**
 * Data Desk brand mark — a rounded "desk" tile with ascending data bars.
 * Built entirely from views (no raster assets).
 */
export function Logo({ size = 28, variant = 'color' }: LogoProps) {
  const isLight = variant === 'light';
  const markBg = isLight ? '#FFFFFF' : THEME.colors.primary;
  const barColor = isLight ? THEME.colors.primary : '#FFFFFF';

  const pad = size * 0.22;
  const innerHeight = size - pad * 2;
  const barWidth = size * 0.13;
  const heights = [0.45, 0.72, 1];

  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: markBg,
          padding: pad,
          gap: size * 0.09,
        },
        !isLight && THEME.shadow.glow,
      ]}
    >
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: innerHeight * h,
            borderRadius: barWidth / 2,
            backgroundColor: barColor,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
