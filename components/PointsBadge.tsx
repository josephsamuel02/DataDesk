import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

interface PointsBadgeProps {
  points: number;
  size?: 'small' | 'medium' | 'large';
}

export function PointsBadge({ points, size = 'medium' }: PointsBadgeProps) {
  const styles = getStyles(size);

  return (
    <View style={styles.container}>
      <Text style={styles.star}>⭐</Text>
      <Text style={styles.points}>{points.toLocaleString()} pts</Text>
    </View>
  );
}

function getStyles(size: 'small' | 'medium' | 'large') {
  const sizeMaps = {
    small: { paddingH: 10, paddingV: 5, fontSize: 12, starSize: 12 },
    medium: { paddingH: 14, paddingV: 8, fontSize: 15, starSize: 14 },
    large: { paddingH: 20, paddingV: 12, fontSize: 20, starSize: 18 },
  };
  const s = sizeMaps[size];

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.colors.accent,
      paddingHorizontal: s.paddingH,
      paddingVertical: s.paddingV,
      borderRadius: THEME.borderRadius.badge,
      gap: 5,
      ...THEME.shadow.glow,
    },
    star: {
      fontSize: s.starSize,
    },
    points: {
      fontSize: s.fontSize,
      fontWeight: THEME.fontWeight.extraBold,
      color: THEME.colors.accentText,
    },
  });
}
