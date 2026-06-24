import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Profile } from '../../lib/supabase';
import { awardPoints } from '../../lib/adService';
import { claimDailyBonus, isDailyBonusClaimed } from '../../lib/earnService';
import { ensureProfile } from '../../lib/profileService';
import { THEME } from '../../constants/theme';
import { AD_TYPES, AdType } from '../../constants/adTypes';
import { EARN_POINTS } from '../../constants/earn';
import { AdCard } from '../../components/AdCard';
import { useDialog } from '../../components/DialogProvider';
import { Avatar } from '../../components/Avatar';

// Skeleton loader block
function Skeleton({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: 12, backgroundColor: THEME.colors.skeleton, opacity }, style]}
    />
  );
}

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  surface: string;
  label: string;
  subtitle: string;
  onPress: () => void;
}

function QuickAction({ icon, color, surface, label, subtitle, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: surface }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.quickActionSub} numberOfLines={1}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dialog = useDialog();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayPoints, setTodayPoints] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Light status bar icons while the navy header is on screen
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const prof = await ensureProfile();
    if (prof) setProfile(prof);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: txData } = await supabase
      .from('points_transactions')
      .select('points_earned')
      .eq('user_id', user.id)
      .gte('watched_at', today.toISOString());

    if (txData) {
      const total = txData.reduce((sum: number, t: any) => sum + t.points_earned, 0);
      setTodayPoints(total);
    }
  }

  async function initialize() {
    setLoading(true);
    await loadProfile();
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  useEffect(() => {
    initialize();
  }, []);

  function showToast(message: string) {
    setToastMessage(message);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }

  async function handleClaimDailyBonus() {
    const result = await claimDailyBonus();
    if (!result.success) {
      dialog.alert({
        title: 'Something went wrong',
        message: result.error ?? 'Could not claim your bonus. Try again.',
        variant: 'error',
      });
      return;
    }
    if (result.alreadyClaimed) {
      dialog.alert({
        title: 'Already Claimed',
        message: 'You have already claimed your daily bonus today. Come back tomorrow!',
        variant: 'info',
      });
      // Sync local claimed state.
      const todayStr = new Date().toISOString().slice(0, 10);
      setProfile((prev) =>
        prev ? { ...prev, last_daily_bonus_at: todayStr, points: result.newTotal ?? prev.points } : prev,
      );
      return;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    setProfile((prev) =>
      prev
        ? { ...prev, points: result.newTotal ?? prev.points, last_daily_bonus_at: todayStr }
        : prev,
    );
    setTodayPoints((prev) => prev + (result.awarded ?? EARN_POINTS.dailyBonus));
    showToast(`🎁 Daily bonus claimed! +${result.awarded ?? EARN_POINTS.dailyBonus} points`);
  }

  async function handleShareReferral() {
    const code = profile?.referral_code;
    if (!code) {
      dialog.alert({
        title: 'Refer & Earn',
        message: 'Your referral code is still being set up. Pull to refresh and try again.',
        variant: 'info',
      });
      return;
    }
    try {
      await Share.share({
        message:
          `Join me on Data Desk and turn ads into free data! 🎉\n\n` +
          `Use my referral code ${code} when you sign up — I'll get ${EARN_POINTS.referralSignup} points. ` +
          `Download Data Desk now.`,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  async function handleAdComplete(adType: AdType) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Resolve the real ad_types UUID by name. If it isn't found (table not
    // seeded / name mismatch), pass null instead of the local numeric id —
    // the DB column is a UUID FK and a value like "1" would be rejected.
    const { data: adTypeRows } = await supabase
      .from('ad_types')
      .select('id')
      .eq('name', adType.name)
      .limit(1);

    const adTypeId = adTypeRows?.[0]?.id ?? null;

    const result = await awardPoints(user.id, adTypeId, adType.points);
    if (result.success) {
      setProfile((prev) => (prev ? { ...prev, points: result.newTotal } : prev));
      setTodayPoints((prev) => prev + adType.points);
      showToast(`🎉 You earned ${adType.points} point${adType.points !== 1 ? 's' : ''}! Keep going on Data Desk!`);
    } else {
      dialog.alert({
        title: 'Something went wrong',
        message: result.error ?? 'Could not award points. Try again.',
        variant: 'error',
      });
    }
  }

  const greetingName = profile?.username
    ? profile.username.split(' ')[0]
    : profile?.email
      ? profile.email.split('@')[0]
      : 'there';

  const points = profile?.points ?? 0;
  const dailyClaimed = isDailyBonusClaimed(profile?.last_daily_bonus_at ?? null);

  const nextMilestoneTarget = (() => {
    if (points < 50) return 50;
    if (points < 100) return 100;
    if (points < 180) return 180;
    if (points < 400) return 400;
    return 700;
  })();

  const initial = (profile?.username ?? profile?.email ?? 'D')[0]?.toUpperCase();

  return (
    <View style={styles.root}>
      {/* Navy status bar backdrop */}
      <View style={[styles.statusBackdrop, { height: insets.top }]} />

      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.colors.primary]}
              tintColor={THEME.colors.primary}
            />
          }
        >
          {/* ── HEADER ───────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Avatar value={profile?.avatar_url} size={46} initial={initial} />
              <View>
                {loading ? (
                  <Skeleton width={140} height={18} />
                ) : (
                  <Text style={styles.greeting}>Hello, {greetingName}! 👋</Text>
                )}
                <Text style={styles.greetingSub}>Welcome to Data Desk</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.8}
              onPress={() => dialog.alert({ title: 'Notifications', message: 'You have no new notifications right now.', variant: 'info' })}
            >
              <Ionicons name="notifications-outline" size={22} color={THEME.colors.primary} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>

          {/* ── POINTS BALANCE CARD ──────────────────────────── */}
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => router.push('/(tabs)/redeem')}
            style={styles.balanceCard}
          >
            <View style={styles.balanceDecorLg} pointerEvents="none" />
            <View style={styles.balanceDecorSm} pointerEvents="none" />

            <View style={styles.balanceContent}>
              <View style={styles.balanceTopRow}>
                <Text style={styles.balanceLabel}>Your Points Balance</Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
              </View>

              {loading ? (
                <Skeleton width={150} height={40} style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 6 }} />
              ) : (
                <View style={styles.balanceAmountRow}>
                  <Text style={styles.balanceAmount}>{points.toLocaleString()}</Text>
                  <View style={styles.coinBadge}>
                    <Text style={styles.coinStar}>⭐</Text>
                  </View>
                </View>
              )}

              <Text style={styles.balanceWorth}>≈ ₦{points.toLocaleString()} worth of data</Text>

              <TouchableOpacity
                style={styles.redeemBtn}
                activeOpacity={0.9}
                onPress={() => router.push('/(tabs)/redeem')}
              >
                <Text style={styles.redeemBtnText}>Redeem Data</Text>
                <Ionicons name="arrow-forward" size={16} color={THEME.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Gift illustration */}
            <Text style={styles.giftEmoji}>🎁</Text>
          </TouchableOpacity>

          {/* ── EARN POINTS ──────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Earn Points</Text>
              <Text style={styles.sectionSubtitle}>Watch ads, log in daily & refer friends</Text>
            </View>
            <View style={styles.adsAvailable}>
              <View style={styles.adsDot} />
              <Text style={styles.adsAvailableText}>3 ways to earn</Text>
            </View>
          </View>

          <View style={styles.adsContainer}>
            {loading ? (
              [1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={78} style={{ marginBottom: 12, borderRadius: 20 }} />
              ))
            ) : (
              <>
                {AD_TYPES.map((adType) => (
                  <AdCard
                    key={adType.id}
                    adType={adType}
                    userPoints={points}
                    nextMilestone={nextMilestoneTarget}
                    onAdComplete={handleAdComplete}
                  />
                ))}

                {/* Daily login bonus */}
                <View style={styles.earnRow}>
                  <View style={[styles.iconSquare, { backgroundColor: THEME.category.orange.surface }]}>
                    <Ionicons name="calendar-outline" size={22} color={THEME.category.orange.color} />
                  </View>
                  <View style={styles.earnInfo}>
                    <Text style={styles.earnTitle} numberOfLines={1}>Daily Login Bonus</Text>
                    <Text style={styles.earnSub} numberOfLines={1}>
                      {dailyClaimed ? 'Come back tomorrow for more' : 'Claim once every day'}
                    </Text>
                  </View>
                  <View style={styles.earnRight}>
                    <View style={styles.pointsPill}>
                      <Text style={styles.pointsPillText}>+{EARN_POINTS.dailyBonus}</Text>
                      <Text style={styles.pointsStar}>⭐</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.earnBtn, dailyClaimed && styles.earnBtnDone]}
                      onPress={handleClaimDailyBonus}
                      activeOpacity={0.85}
                      disabled={dailyClaimed}
                    >
                      <Text style={[styles.earnBtnText, dailyClaimed && styles.earnBtnTextDone]}>
                        {dailyClaimed ? 'Claimed' : 'Claim'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Referral */}
                <View style={styles.earnRow}>
                  <View style={[styles.iconSquare, { backgroundColor: THEME.category.green.surface }]}>
                    <Ionicons name="people-outline" size={22} color={THEME.category.green.color} />
                  </View>
                  <View style={styles.earnInfo}>
                    <Text style={styles.earnTitle} numberOfLines={1}>Refer a Friend</Text>
                    <Text style={styles.earnSub} numberOfLines={1}>
                      {profile?.referral_code ? `Your code: ${profile.referral_code}` : 'Invite friends to earn'}
                    </Text>
                  </View>
                  <View style={styles.earnRight}>
                    <View style={styles.pointsPill}>
                      <Text style={styles.pointsPillText}>+{EARN_POINTS.referralSignup}</Text>
                      <Text style={styles.pointsStar}>⭐</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.earnBtn}
                      onPress={handleShareReferral}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.earnBtnText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* ── QUICK ACTIONS ────────────────────────────────── */}
          <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Quick Actions</Text>
          <View style={styles.quickRow}>
            <QuickAction
              icon="swap-vertical"
              color={THEME.category.green.color}
              surface={THEME.category.green.surface}
              label="Buy Data"
              subtitle="Pay & Get Data"
              onPress={() => dialog.alert({ title: 'Buy Data', message: 'Direct data purchase is coming soon to Data Desk!', variant: 'info' })}
            />
            <QuickAction
              icon="phone-portrait-outline"
              color={THEME.category.blue.color}
              surface={THEME.category.blue.surface}
              label="Redeem Data"
              subtitle="Use Points"
              onPress={() => router.push('/(tabs)/redeem')}
            />
            <QuickAction
              icon="time-outline"
              color={THEME.category.purple.color}
              surface={THEME.category.purple.surface}
              label="History"
              subtitle="View Activity"
              onPress={() => router.push('/(tabs)/history')}
            />
            <QuickAction
              icon="gift-outline"
              color={THEME.category.orange.color}
              surface={THEME.category.orange.surface}
              label="Refer & Earn"
              subtitle="Invite Friends"
              onPress={handleShareReferral}
            />
          </View>

          {/* ── REFERRAL BANNER ──────────────────────────────── */}
          <View style={styles.referralCard}>
            <View style={styles.balanceDecorSm} pointerEvents="none" />
            <Text style={styles.referralGift}>🎁</Text>
            <View style={styles.referralText}>
              <Text style={styles.referralTitle}>Invite friends & earn more points!</Text>
              <Text style={styles.referralSub}>
                Get <Text style={styles.referralBold}>{EARN_POINTS.referralSignup} points</Text> for every
                friend who signs up with your code
                {profile?.referral_code ? (
                  <Text style={styles.referralBold}> ({profile.referral_code})</Text>
                ) : null}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.inviteBtn}
              activeOpacity={0.9}
              onPress={handleShareReferral}
            >
              <Text style={styles.inviteBtnText}>Invite</Text>
              <Ionicons name="arrow-forward" size={14} color={THEME.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Toast notification */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  statusBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.colors.background,
  },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 18,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
  },
  greeting: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
  },
  greetingSub: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadow.small,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: THEME.colors.error,
    borderWidth: 1.5,
    borderColor: THEME.colors.card,
  },

  // Balance card
  balanceCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.card,
    padding: 22,
    marginBottom: 26,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    ...THEME.shadow.large,
  },
  balanceDecorLg: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  balanceDecorSm: {
    position: 'absolute',
    bottom: -50,
    right: 40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  balanceContent: {
    flex: 1,
    gap: 4,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: THEME.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: THEME.fontWeight.medium,
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  balanceAmount: {
    fontSize: THEME.fontSize.hero,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
  },
  coinBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinStar: { fontSize: 16 },
  balanceWorth: {
    fontSize: THEME.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 12,
  },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.button,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  redeemBtnText: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.bold,
    fontSize: THEME.fontSize.base,
  },
  giftEmoji: {
    fontSize: 76,
    marginLeft: 6,
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
  },
  sectionSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  adsAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  adsDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.colors.success,
  },
  adsAvailableText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.success,
    fontWeight: THEME.fontWeight.semiBold,
  },
  adsContainer: {
    marginBottom: 28,
  },

  // Earn action rows (daily bonus, referral)
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    ...THEME.shadow.small,
  },
  iconSquare: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnInfo: {
    flex: 1,
    gap: 2,
  },
  earnTitle: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  earnSub: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  earnRight: {
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
  earnBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.button,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  earnBtnText: {
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.bold,
    fontSize: THEME.fontSize.sm,
  },
  earnBtnDone: {
    backgroundColor: THEME.colors.skeleton,
  },
  earnBtnTextDone: {
    color: THEME.colors.textSecondary,
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
  },
  quickAction: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
    ...THEME.shadow.small,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    textAlign: 'center',
  },
  quickActionSub: {
    fontSize: 9.5,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },

  // Referral banner
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.card,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
    ...THEME.shadow.medium,
  },
  referralGift: {
    fontSize: 40,
  },
  referralText: {
    flex: 1,
    gap: 3,
  },
  referralTitle: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.bold,
    color: '#FFFFFF',
  },
  referralSub: {
    fontSize: THEME.fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  referralBold: {
    color: THEME.colors.accent,
    fontWeight: THEME.fontWeight.bold,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  inviteBtnText: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.bold,
    fontSize: THEME.fontSize.sm,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: THEME.colors.text,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...THEME.shadow.large,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.semiBold,
    fontSize: THEME.fontSize.base,
    textAlign: 'center',
  },
});
