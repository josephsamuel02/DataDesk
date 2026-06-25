import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { getTierConfig, TIER_UNLOCKS } from '../lib/tierService';

interface TierProgressCardProps {
  tier: number;
  currentStreak: number;
  lifetimeAds: number;
}

export function TierProgressCard({ tier, currentStreak, lifetimeAds }: TierProgressCardProps) {
  const config = getTierConfig(tier);
  const nextTier = tier + 1;
  const isMax = tier >= 3;

  // Pick whichever milestone toward the next tier is closer to completion.
  let progress = { label: '', ratio: 0, detail: '' };
  if (!isMax) {
    const unlock = TIER_UNLOCKS[nextTier];
    const streakRatio = Math.min(1, currentStreak / unlock.streak);
    const lifetimeRatio = Math.min(1, lifetimeAds / unlock.lifetime);
    if (streakRatio >= lifetimeRatio) {
      progress = {
        label: `${unlock.streak}-day streak`,
        ratio: streakRatio,
        detail: `you're on day ${currentStreak}`,
      };
    } else {
      progress = {
        label: `${unlock.lifetime} lifetime ads`,
        ratio: lifetimeRatio,
        detail: `you have ${lifetimeAds}`,
      };
    }
  }

  return (
    <View style={[styles.card, { borderLeftColor: config.color }]}>
      <View style={styles.headerRow}>
        <Text style={styles.tierIcon}>{config.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.tierName}>{config.name} Tier</Text>
          <Text style={styles.tierSub}>{config.dailyLimit} ads/day</Text>
        </View>
      </View>

      {isMax ? (
        <View style={styles.maxBox}>
          <Text style={styles.maxTitle}>🏆 Maximum tier reached!</Text>
          <View style={styles.statsRow}>
            <Stat label="Current streak" value={`${currentStreak}d`} />
            <Stat label="Lifetime ads" value={`${lifetimeAds}`} />
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.nextLine}>
            Reach <Text style={[styles.nextName, { color: getTierConfig(nextTier).color }]}>
              {getTierConfig(nextTier).name}
            </Text>: {progress.label} ({progress.detail})
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress.ratio * 100}%`, backgroundColor: config.color }]} />
          </View>
          <Text style={styles.altHint}>
            Streak {currentStreak}/{TIER_UNLOCKS[nextTier].streak} · Lifetime {lifetimeAds}/{TIER_UNLOCKS[nextTier].lifetime}
          </Text>
        </>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    gap: 10,
    ...THEME.shadow.small,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierIcon: { fontSize: 30 },
  tierName: { fontSize: THEME.fontSize.md, fontWeight: THEME.fontWeight.extraBold, color: THEME.colors.text },
  tierSub: { fontSize: THEME.fontSize.sm, color: THEME.colors.textSecondary },
  nextLine: { fontSize: THEME.fontSize.sm, color: THEME.colors.text, lineHeight: 20 },
  nextName: { fontWeight: THEME.fontWeight.bold },
  track: { width: '100%', height: 8, borderRadius: 4, backgroundColor: THEME.colors.background, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  altHint: { fontSize: THEME.fontSize.xs, color: THEME.colors.textSecondary },
  maxBox: { gap: 12 },
  maxTitle: { fontSize: THEME.fontSize.base, fontWeight: THEME.fontWeight.bold, color: THEME.colors.text },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: THEME.fontSize.lg, fontWeight: THEME.fontWeight.extraBold, color: THEME.colors.primary },
  statLabel: { fontSize: THEME.fontSize.xs, color: THEME.colors.textSecondary },
});
