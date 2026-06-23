import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { parsePreset } from '../constants/avatars';

interface AvatarProps {
  value?: string | null;
  size?: number;
  initial?: string;
  borderColor?: string;
  borderWidth?: number;
}

/** Renders a user's avatar: a preset icon, an uploaded image, or an initial. */
export function Avatar({
  value,
  size = 72,
  initial = 'U',
  borderColor,
  borderWidth = 0,
}: AvatarProps) {
  const preset = parsePreset(value);
  const radius = size / 2;
  const frame = {
    width: size,
    height: size,
    borderRadius: radius,
    borderColor,
    borderWidth: borderColor ? borderWidth || 2.5 : 0,
  };

  if (preset) {
    return (
      <View style={[styles.center, frame, { backgroundColor: preset.bg }]}>
        <Ionicons name={preset.icon} size={size * 0.5} color="#FFFFFF" />
      </View>
    );
  }

  if (value) {
    return <Image source={{ uri: value }} style={frame} />;
  }

  return (
    <View style={[styles.center, frame, styles.placeholder]}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '800', color: THEME.colors.primary }}>
        {initial.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: '#FFFFFF',
  },
});
