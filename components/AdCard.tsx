import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { THEME } from '../constants/theme';
import { AdType } from '../constants/adTypes';
import { ProgressBar } from './ProgressBar';

interface AdCardProps {
  adType: AdType;
  userPoints: number;
  nextMilestone: number;
  onAdComplete: (adType: AdType) => Promise<void>;
  disabled?: boolean;
}

const TIER_COLORS: Record<string, string> = {
  premium: THEME.colors.primaryDeep,
  standard: THEME.colors.primaryDark,
  basic: THEME.colors.primary,
  mini: THEME.colors.success,
};

export function AdCard({
  adType,
  userPoints,
  nextMilestone,
  onAdComplete,
  disabled = false,
}: AdCardProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(adType.durationSeconds);
  const [watching, setWatching] = useState(false);
  const [completed, setCompleted] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stars = '⭐'.repeat(adType.starsCount);
  const cardColor = TIER_COLORS[adType.tier];
  const isLarge = adType.tier === 'premium';

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    ).start();
  }

  function openAd() {
    setCountdown(adType.durationSeconds);
    setCompleted(false);
    setWatching(true);
    setModalVisible(true);
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: adType.durationSeconds * 1000,
      useNativeDriver: false,
      easing: Easing.linear,
    }).start();

    startPulse();

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setWatching(false);
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function claimPoints() {
    setModalVisible(false);
    await onAdComplete(adType);
  }

  function pressIn() {
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(pressAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <>
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <View
          style={[
            styles.card,
            { backgroundColor: cardColor },
            isLarge && styles.cardLarge,
            disabled && styles.cardDisabled,
          ]}
        >
          {/* Decorative corner circles */}
          <View style={styles.decorCircleLg} pointerEvents="none" />
          <View style={styles.decorCircleSm} pointerEvents="none" />

          {isLarge && (
            <View style={styles.bestValueTag}>
              <Text style={styles.bestValueText}>★ BEST VALUE</Text>
            </View>
          )}

          {/* Top row */}
          <View style={styles.topRow}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconBubbleText}>{isLarge ? '🎬' : adType.tier === 'mini' ? '⚡' : '📺'}</Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>⏱ {adType.durationSeconds}s</Text>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.adName}>{adType.name}</Text>
            <Text style={styles.stars}>
              {stars} <Text style={styles.pointsInline}>+{adType.points} pts</Text>
            </Text>
          </View>

          <Text style={styles.description}>{adType.description}</Text>

          {/* Progress to milestone */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Progress to next free data</Text>
            <ProgressBar
              current={Math.min(userPoints, nextMilestone)}
              target={nextMilestone}
              color={THEME.colors.primaryLight}
              trackColor="rgba(255,255,255,0.25)"
              height={7}
              showLabel={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.watchBtn, disabled && styles.btnDisabled]}
            onPress={openAd}
            onPressIn={pressIn}
            onPressOut={pressOut}
            activeOpacity={0.9}
            disabled={disabled}
          >
            <Text style={styles.watchBtnText}>▶  Watch Now</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Ad watching modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (!watching) setModalVisible(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.adSimulator, { backgroundColor: cardColor }]}>
            <View style={styles.decorCircleLg} pointerEvents="none" />
            <View style={styles.decorCircleSm} pointerEvents="none" />

            {/* Simulated ad content */}
            <Text style={styles.adSimLabel}>📱 Advertisement</Text>
            <Text style={styles.adSimBrand}>Data Desk Presents</Text>
            <Text style={styles.adSimTitle}>{adType.name}</Text>
            <Text style={styles.adSimSubtitle}>
              {watching ? `Your Data, Your Way\nEarning while you watch...` : ''}
            </Text>

            {/* Progress bar */}
            <View style={styles.adProgressTrack}>
              <Animated.View style={[styles.adProgressFill, { width: barWidth }]} />
            </View>

            {watching ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={styles.countdownCircle}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                  <Text style={styles.countdownLabel}>seconds left</Text>
                </View>
              </Animated.View>
            ) : completed ? (
              <View style={styles.completedSection}>
                <Text style={styles.completedEmoji}>🎉</Text>
                <Text style={styles.completedTitle}>Ad Complete!</Text>
                <Text style={styles.completedSubtitle}>
                  You earned {adType.points} point{adType.points !== 1 ? 's' : ''}
                </Text>
                <TouchableOpacity style={styles.claimBtn} onPress={claimPoints} activeOpacity={0.9}>
                  <Text style={styles.claimBtnText}>Claim {stars} {adType.points} pts</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Can't skip while watching */}
          {!watching && !completed && (
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          )}
          {watching && (
            <View style={styles.cantSkipBanner}>
              <Text style={styles.cantSkipText}>
                ⏳ Please watch the full ad to earn your points
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: THEME.borderRadius.card,
    padding: 18,
    marginBottom: 14,
    gap: 12,
    overflow: 'hidden',
    ...THEME.shadow.medium,
  },
  cardLarge: {
    padding: 22,
    ...THEME.shadow.large,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  decorCircleLg: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircleSm: {
    position: 'absolute',
    bottom: -50,
    left: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bestValueTag: {
    position: 'absolute',
    top: 14,
    right: 0,
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  bestValueText: {
    color: THEME.colors.accentText,
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.extraBold,
    letterSpacing: 0.5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleText: {
    fontSize: 22,
  },
  durationBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
  },
  titleBlock: {
    gap: 3,
  },
  adName: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
  },
  stars: {
    fontSize: THEME.fontSize.base,
    marginTop: 2,
  },
  pointsInline: {
    color: THEME.colors.accent,
    fontWeight: THEME.fontWeight.extraBold,
    fontSize: THEME.fontSize.md,
  },
  description: {
    fontSize: THEME.fontSize.sm,
    color: 'rgba(255,255,255,0.88)',
  },
  progressSection: {
    gap: 6,
  },
  progressLabel: {
    fontSize: THEME.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  watchBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.button,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 2,
    ...THEME.shadow.small,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  watchBtnText: {
    color: THEME.colors.primaryDark,
    fontWeight: THEME.fontWeight.extraBold,
    fontSize: THEME.fontSize.base,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.primaryDeep,
  },
  adSimulator: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
  adSimLabel: {
    fontSize: THEME.fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  adSimBrand: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.accent,
    fontWeight: THEME.fontWeight.semiBold,
  },
  adSimTitle: {
    fontSize: THEME.fontSize.xxl,
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.extraBold,
    textAlign: 'center',
  },
  adSimSubtitle: {
    fontSize: THEME.fontSize.md,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 26,
  },
  adProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 8,
  },
  adProgressFill: {
    height: 6,
    backgroundColor: THEME.colors.accent,
    borderRadius: 3,
  },
  countdownCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 3,
    borderColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
  },
  countdownLabel: {
    fontSize: THEME.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  completedSection: {
    alignItems: 'center',
    gap: 8,
  },
  completedEmoji: {
    fontSize: 56,
  },
  completedTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
  },
  completedSubtitle: {
    fontSize: THEME.fontSize.md,
    color: 'rgba(255,255,255,0.8)',
  },
  claimBtn: {
    backgroundColor: THEME.colors.accent,
    borderRadius: THEME.borderRadius.button,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
    ...THEME.shadow.glow,
  },
  claimBtnText: {
    color: THEME.colors.accentText,
    fontWeight: THEME.fontWeight.extraBold,
    fontSize: THEME.fontSize.md,
  },
  cantSkipBanner: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.accent,
    padding: 16,
    alignItems: 'center',
  },
  cantSkipText: {
    color: THEME.colors.accent,
    fontWeight: THEME.fontWeight.medium,
    fontSize: THEME.fontSize.sm,
  },
  closeBtn: {
    padding: 20,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: THEME.fontSize.base,
  },
});
