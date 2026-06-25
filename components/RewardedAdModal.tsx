import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { ADMOB } from '../constants/admob';
import { EARN_POINTS } from '../constants/earn';

interface RewardedAdModalProps {
  visible: boolean;
  /** Called only when the (simulated) ad completes — i.e. the reward is earned. */
  onReward: () => void;
  /** Called when the user dismisses before completion (no reward). */
  onClose: () => void;
}

// NOTE: This simulates an AdMob rewarded ad so the earn/tier flow is testable in
// Expo Go. Replace with a real RewardedAd (see constants/admob.ts) for release —
// call onReward strictly from AdMob's "earned reward" callback, never on close.
export function RewardedAdModal({ visible, onReward, onClose }: RewardedAdModalProps) {
  const total = ADMOB.simulatedAdSeconds;
  const [countdown, setCountdown] = useState(total);
  const [completed, setCompleted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCountdown(total);
    setCompleted(false);
    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: total * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible]);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.body}>
          <View style={styles.decorLg} pointerEvents="none" />
          <View style={styles.decorSm} pointerEvents="none" />

          <View style={styles.iconSquare}>
            <Ionicons name="play" size={34} color={THEME.colors.accent} />
          </View>
          <Text style={styles.label}>Advertisement</Text>
          <Text style={styles.brand}>Data Desk Presents</Text>
          <Text style={styles.title}>Rewarded Video Ad</Text>
          <Text style={styles.subtitle}>
            {completed ? '' : 'Your Data, Your Way\nEarning while you watch...'}
          </Text>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: barWidth }]} />
          </View>

          {!completed ? (
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <View style={styles.countdownCircle}>
                <Text style={styles.countdownText}>{countdown}</Text>
                <Text style={styles.countdownLabel}>seconds left</Text>
              </View>
            </Animated.View>
          ) : (
            <View style={styles.completedSection}>
              <Text style={styles.completedEmoji}>🎉</Text>
              <Text style={styles.completedTitle}>Ad Complete!</Text>
              <Text style={styles.completedSubtitle}>
                You earned {EARN_POINTS.rewardedAd} point{EARN_POINTS.rewardedAd !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity style={styles.claimBtn} onPress={onReward} activeOpacity={0.9}>
                <Text style={styles.claimBtnText}>Claim +{EARN_POINTS.rewardedAd} ⭐</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!completed && (
          <View style={styles.cantSkipBanner}>
            <Text style={styles.cantSkipText}>⏳ Watch the full ad to earn your points</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.primaryDeep },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, overflow: 'hidden' },
  decorLg: {
    position: 'absolute', top: -40, right: -50, width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decorSm: {
    position: 'absolute', bottom: 40, left: -40, width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  iconSquare: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(245,197,24,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  label: { fontSize: THEME.fontSize.sm, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase' },
  brand: { fontSize: THEME.fontSize.base, color: THEME.colors.accent, fontWeight: THEME.fontWeight.semiBold },
  title: { fontSize: THEME.fontSize.xxl, color: '#FFFFFF', fontWeight: THEME.fontWeight.extraBold, textAlign: 'center' },
  subtitle: { fontSize: THEME.fontSize.md, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 26 },
  progressTrack: {
    width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3,
    overflow: 'hidden', marginVertical: 8,
  },
  progressFill: { height: 6, backgroundColor: THEME.colors.accent, borderRadius: 3 },
  countdownCircle: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 3, borderColor: THEME.colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  countdownText: { fontSize: THEME.fontSize.xxl, fontWeight: THEME.fontWeight.extraBold, color: '#FFFFFF' },
  countdownLabel: { fontSize: THEME.fontSize.xs, color: 'rgba(255,255,255,0.7)' },
  completedSection: { alignItems: 'center', gap: 8 },
  completedEmoji: { fontSize: 56 },
  completedTitle: { fontSize: THEME.fontSize.xl, fontWeight: THEME.fontWeight.extraBold, color: '#FFFFFF' },
  completedSubtitle: { fontSize: THEME.fontSize.md, color: 'rgba(255,255,255,0.8)' },
  claimBtn: {
    backgroundColor: THEME.colors.accent, borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 32, paddingVertical: 14, marginTop: 8, ...THEME.shadow.glow,
  },
  claimBtnText: { color: THEME.colors.accentText, fontWeight: THEME.fontWeight.extraBold, fontSize: THEME.fontSize.md },
  cantSkipBanner: {
    backgroundColor: 'rgba(245,197,24,0.15)', borderTopWidth: 1, borderTopColor: THEME.colors.accent,
    padding: 16, alignItems: 'center',
  },
  cantSkipText: { color: THEME.colors.accent, fontWeight: THEME.fontWeight.medium, fontSize: THEME.fontSize.sm },
});
