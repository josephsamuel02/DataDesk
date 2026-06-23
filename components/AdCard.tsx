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
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { AdType } from '../constants/adTypes';

interface AdCardProps {
  adType: AdType;
  userPoints: number;
  nextMilestone: number;
  onAdComplete: (adType: AdType) => Promise<void>;
  disabled?: boolean;
}

export function AdCard({ adType, onAdComplete, disabled = false }: AdCardProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(adType.durationSeconds);
  const [watching, setWatching] = useState(false);
  const [completed, setCompleted] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      <View style={[styles.card, disabled && styles.cardDisabled]}>
        {/* Category icon */}
        <View style={[styles.iconSquare, { backgroundColor: adType.iconSurface }]}>
          <Ionicons name="play" size={22} color={adType.iconColor} />
        </View>

        {/* Middle info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{adType.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{adType.description}</Text>
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={13} color={THEME.colors.textSecondary} />
            <Text style={styles.durationText}>{adType.durationSeconds} sec</Text>
          </View>
        </View>

        {/* Right column: points pill + Watch button */}
        <View style={styles.right}>
          <View style={styles.pointsPill}>
            <Text style={styles.pointsPillText}>+{adType.points}</Text>
            <Text style={styles.pointsStar}>⭐</Text>
          </View>
          <TouchableOpacity
            style={[styles.watchBtn, disabled && styles.btnDisabled]}
            onPress={openAd}
            activeOpacity={0.85}
            disabled={disabled}
          >
            <Text style={styles.watchBtnText}>Watch Now</Text>
          </TouchableOpacity>
        </View>
      </View>

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
          <View style={styles.adSimulator}>
            <View style={styles.decorCircleLg} pointerEvents="none" />
            <View style={styles.decorCircleSm} pointerEvents="none" />

            <View style={[styles.modalIconSquare, { backgroundColor: adType.iconSurface }]}>
              <Ionicons name="play" size={34} color={adType.iconColor} />
            </View>
            <Text style={styles.adSimLabel}>Advertisement</Text>
            <Text style={styles.adSimBrand}>Data Desk Presents</Text>
            <Text style={styles.adSimTitle}>{adType.name}</Text>
            <Text style={styles.adSimSubtitle}>
              {watching ? 'Your Data, Your Way\nEarning while you watch...' : ''}
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
                  <Text style={styles.claimBtnText}>Claim +{adType.points} ⭐</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    ...THEME.shadow.small,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconSquare: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  durationText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: THEME.colors.goldSurface,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pointsPillText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#B45309',
  },
  pointsStar: {
    fontSize: 11,
  },
  watchBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.button,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  watchBtnText: {
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.bold,
    fontSize: THEME.fontSize.sm,
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
    gap: 14,
    overflow: 'hidden',
  },
  decorCircleLg: {
    position: 'absolute',
    top: -40,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decorCircleSm: {
    position: 'absolute',
    bottom: 40,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modalIconSquare: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    borderRadius: THEME.borderRadius.pill,
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
    backgroundColor: 'rgba(245,197,24,0.15)',
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
