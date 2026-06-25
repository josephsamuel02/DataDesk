import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { AD_COOLDOWN_SECONDS } from '../lib/tierService';

/** Format a number of seconds as M:SS for the countdown timer. */
function formatCooldown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

interface AdCooldownTimerProps {
  lastAdWatchedAt: string | null;
  onReady?: () => void;
  onWatchAd: () => void;
  /** Disable the button (e.g. daily limit reached). */
  disabled?: boolean;
  /** Label shown when disabled. */
  disabledLabel?: string;
}

function computeRemaining(ts: string | null): number {
  if (!ts) return 0;
  const elapsed = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  return Math.max(0, AD_COOLDOWN_SECONDS - elapsed);
}

export function AdCooldownTimer({
  lastAdWatchedAt,
  onReady,
  onWatchAd,
  disabled = false,
  disabledLabel = 'Daily limit reached',
}: AdCooldownTimerProps) {
  const [remaining, setRemaining] = useState(() => computeRemaining(lastAdWatchedAt));
  const firedReady = useRef(false);

  // Re-sync whenever the last-watched timestamp changes, and tick every second.
  useEffect(() => {
    firedReady.current = false;
    setRemaining(computeRemaining(lastAdWatchedAt));
    if (!lastAdWatchedAt) return;

    const id = setInterval(() => setRemaining(computeRemaining(lastAdWatchedAt)), 1000);
    return () => clearInterval(id);
  }, [lastAdWatchedAt]);

  // Fire onReady exactly once when the cooldown elapses.
  useEffect(() => {
    if (remaining === 0 && lastAdWatchedAt && !firedReady.current) {
      firedReady.current = true;
      onReady?.();
    }
  }, [remaining, lastAdWatchedAt, onReady]);

  const counting = remaining > 0;
  const pct = counting ? ((AD_COOLDOWN_SECONDS - remaining) / AD_COOLDOWN_SECONDS) * 100 : 100;

  if (counting) {
    return (
      <View style={styles.cooldownCard}>
        <Text style={styles.cooldownLabel}>Next ad in</Text>
        <Text style={styles.cooldownTime}>{formatCooldown(remaining)}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.cooldownHint}>Take a short break — keeps your rewards fair</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.watchBtn, disabled && styles.watchBtnDisabled]}
      onPress={onWatchAd}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Ionicons
        name={disabled ? 'checkmark-done' : 'play-circle'}
        size={20}
        color={disabled ? THEME.colors.textSecondary : '#FFFFFF'}
      />
      <Text style={[styles.watchBtnText, disabled && styles.watchBtnTextDisabled]}>
        {disabled ? disabledLabel : 'Watch Ad & Earn'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 54,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.button,
    ...THEME.shadow.medium,
  },
  watchBtnDisabled: {
    backgroundColor: THEME.colors.skeleton,
    ...({ shadowOpacity: 0, elevation: 0 } as object),
  },
  watchBtnText: { color: '#FFFFFF', fontWeight: THEME.fontWeight.bold, fontSize: THEME.fontSize.md },
  watchBtnTextDisabled: { color: THEME.colors.textSecondary },

  cooldownCard: {
    width: '100%',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
    ...THEME.shadow.small,
  },
  cooldownLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  cooldownTime: {
    fontSize: THEME.fontSize.hero,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.primary,
    letterSpacing: 1,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.background,
    overflow: 'hidden',
    marginTop: 2,
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: THEME.colors.accent },
  cooldownHint: { fontSize: THEME.fontSize.xs, color: THEME.colors.textSecondary, textAlign: 'center' },
});
