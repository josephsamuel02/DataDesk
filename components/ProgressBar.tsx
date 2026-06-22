import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { THEME } from '../constants/theme';

interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  color?: string;
  trackColor?: string;
  height?: number;
  showLabel?: boolean;
}

export function ProgressBar({
  current,
  target,
  label,
  color = THEME.colors.primary,
  trackColor = THEME.colors.skeleton,
  height = 8,
  showLabel = true,
}: ProgressBarProps) {
  const progress = Math.min(current / Math.max(target, 1), 1);
  const percentage = Math.round(progress * 100);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {showLabel && label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.track, { height, backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animatedWidth,
              backgroundColor: color,
              height,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.percentText}>
          {current} / {target} pts
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  track: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
  percentText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'right',
  },
});
