import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { getTierConfig } from '../lib/tierService';

interface DailyAdProgressProps {
  adsWatchedToday: number;
  tier: number;
}

export function DailyAdProgress({ adsWatchedToday, tier }: DailyAdProgressProps) {
  const config = getTierConfig(tier);
  const limit = config.dailyLimit;
  const watched = Math.min(adsWatchedToday, limit);
  const ratio = limit > 0 ? watched / limit : 0;
  const reached = adsWatchedToday >= limit;
  const nearlyDone = ratio >= 0.8;
  const fillColor = nearlyDone ? THEME.colors.accent : THEME.colors.primary;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>
          Today: <Text style={styles.labelStrong}>{watched}</Text> / {limit} ads
        </Text>
        <View style={[styles.tierBadge, { backgroundColor: config.color + '22' }]}>
          <Text style={styles.tierBadgeText}>{config.icon} {config.name}</Text>
        </View>
      </View>

      {reached ? (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={18} color={THEME.colors.success} />
          <Text style={styles.doneText}>Daily limit reached — come back tomorrow!</Text>
        </View>
      ) : (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fillColor }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 14,
    gap: 10,
    ...THEME.shadow.small,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: THEME.fontSize.sm, color: THEME.colors.textSecondary },
  labelStrong: { color: THEME.colors.text, fontWeight: THEME.fontWeight.extraBold },
  tierBadge: { borderRadius: THEME.borderRadius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { fontSize: THEME.fontSize.xs, fontWeight: THEME.fontWeight.bold, color: THEME.colors.text },
  track: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8F0FE',
    overflow: 'hidden',
  },
  fill: { height: 10, borderRadius: 5 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneText: { flex: 1, fontSize: THEME.fontSize.sm, color: THEME.colors.success, fontWeight: THEME.fontWeight.semiBold },
});
