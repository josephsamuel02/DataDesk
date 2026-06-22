import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { supabase, Profile } from '../../lib/supabase';
import { awardPoints } from '../../lib/adService';
import { THEME } from '../../constants/theme';
import { AD_TYPES, AdType } from '../../constants/adTypes';
import { NETWORKS, DIRECT_PURCHASE_PLANS, Network } from '../../constants/networks';
import { AdCard } from '../../components/AdCard';
import { PointsBadge } from '../../components/PointsBadge';
import { NetworkSelector } from '../../components/NetworkSelector';
import { Logo } from '../../components/Logo';

// Points needed for next free data tier
const NEXT_MILESTONE = 50;

// Skeleton loader block
function Skeleton({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: 8, backgroundColor: THEME.colors.skeleton, opacity }, style]}
    />
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayPoints, setTodayPoints] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Light status bar icons while the green hero is on screen
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  // Buy data section state
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [buyPhone, setBuyPhone] = useState('');

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) setProfile(data);

    // Fetch today's points earned
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

  async function handleAdComplete(adType: AdType) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find matching ad_type in DB (using local fallback mapping by name)
    const { data: adTypeRow } = await supabase
      .from('ad_types')
      .select('id')
      .eq('name', adType.name)
      .single();

    const adTypeId = adTypeRow?.id ?? adType.id.toString();

    const result = await awardPoints(user.id, adTypeId, adType.points);
    if (result.success) {
      setProfile((prev) => prev ? { ...prev, points: result.newTotal } : prev);
      setTodayPoints((prev) => prev + adType.points);
      showToast(`🎉 You earned ${adType.points} point${adType.points !== 1 ? 's' : ''}! Keep going on Data Desk!`);
    } else {
      Alert.alert('Error', result.error ?? 'Could not award points. Try again.');
    }
  }

  const greetingName = profile?.username
    ? profile.username.split(' ')[0]
    : profile?.email
      ? profile.email.split('@')[0]
      : 'there';

  const nextMilestoneTarget = (() => {
    const pts = profile?.points ?? 0;
    if (pts < 50) return 50;
    if (pts < 100) return 100;
    if (pts < 180) return 180;
    if (pts < 400) return 400;
    return 700;
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
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
        {/* ── HERO HEADER ──────────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <View style={styles.heroDecorLg} pointerEvents="none" />
          <View style={styles.heroDecorSm} pointerEvents="none" />
          <View style={styles.topBar}>
            <View>
              <View style={styles.brandRow}>
                <Logo size={24} variant="light" />
                <Text style={styles.brandName}>Data Desk</Text>
              </View>
              {loading ? (
                <Skeleton width={130} height={20} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
              ) : (
                <Text style={styles.greeting}>Hi {greetingName} 👋</Text>
              )}
              <Text style={styles.heroTagline}>Your Data, Your Way</Text>
            </View>
            {loading ? (
              <Skeleton width={92} height={38} style={{ borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            ) : (
              <PointsBadge points={profile?.points ?? 0} size="medium" />
            )}
          </View>
        </View>

        {/* ── QUICK STATS (overlaps hero) ──────────────────── */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>{todayPoints} pts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total points</Text>
            <Text style={[styles.statValue, { color: THEME.colors.primary }]}>
              {profile?.points ?? 0} pts
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Next reward</Text>
            <Text style={[styles.statValue, { color: THEME.colors.success }]}>
              {nextMilestoneTarget} pts
            </Text>
          </View>
        </View>

        {/* ── AD SECTION (DOMINANT) ─────────────────────────  */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Watch Ads, Earn Points</Text>
          <Text style={styles.sectionSubtitle}>
            Earn points then redeem for free data — it's that simple!
          </Text>
        </View>

        <View style={styles.adsContainer}>
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width="100%" height={140} style={{ marginBottom: 12, borderRadius: 16 }} />
            ))
          ) : (
            AD_TYPES.map((adType) => (
              <AdCard
                key={adType.id}
                adType={adType}
                userPoints={profile?.points ?? 0}
                nextMilestone={nextMilestoneTarget}
                onAdComplete={handleAdComplete}
              />
            ))
          )}
        </View>

        {/* ── BUY DATA SECTION (secondary) ─────────────────── */}
        <View style={styles.buySection}>
          <Text style={styles.buySectionTitle}>Buy Data Directly</Text>
          <Text style={styles.buySectionSubtitle}>
            Skip the ads and buy data instantly
          </Text>

          <View style={styles.buyCard}>
            {/* Network selector */}
            <Text style={styles.buyFieldLabel}>Select Network</Text>
            <NetworkSelector
              selected={selectedNetwork?.id ?? null}
              onSelect={(n) => {
                setSelectedNetwork(n);
                setSelectedPlan('');
              }}
            />

            {/* Plan selector */}
            {selectedNetwork && (
              <>
                <Text style={[styles.buyFieldLabel, { marginTop: 12 }]}>Select Plan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.planRow}>
                    {DIRECT_PURCHASE_PLANS.map((plan) => (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          styles.planChip,
                          selectedPlan === plan.id && styles.planChipSelected,
                        ]}
                        onPress={() => setSelectedPlan(plan.id)}
                      >
                        <Text
                          style={[
                            styles.planChipLabel,
                            selectedPlan === plan.id && styles.planChipLabelSelected,
                          ]}
                        >
                          {plan.label}
                        </Text>
                        <Text
                          style={[
                            styles.planChipPrice,
                            selectedPlan === plan.id && styles.planChipPriceSelected,
                          ]}
                        >
                          ₦{plan.price}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Phone number */}
            <Text style={[styles.buyFieldLabel, { marginTop: 12 }]}>Phone Number</Text>
            <View style={styles.phoneInputRow}>
              <Text style={styles.phoneFlag}>🇳🇬</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="e.g. 08012345678"
                placeholderTextColor={THEME.colors.textSecondary}
                keyboardType="phone-pad"
                value={buyPhone}
                onChangeText={setBuyPhone}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.buyBtn,
                (!selectedNetwork || !selectedPlan || buyPhone.length < 10) && styles.buyBtnDisabled,
              ]}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert(
                  '💳 Buy Data',
                  `Purchase ${selectedPlan} on ${selectedNetwork?.name} for ${buyPhone}?\n\nPayment integration coming soon.`,
                )
              }
              disabled={!selectedNetwork || !selectedPlan || buyPhone.length < 10}
            >
              <Text style={styles.buyBtnText}>Buy Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Toast notification */}
      <Animated.View
        style={[styles.toast, { opacity: toastOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Hero header
  hero: {
    backgroundColor: THEME.colors.primary,
    marginHorizontal: -16,
    marginTop: -12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 46,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    ...THEME.shadow.large,
  },
  heroDecorLg: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroDecorSm: {
    position: 'absolute',
    bottom: -30,
    left: -25,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  brandIcon: { fontSize: 20 },
  brandName: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
  },
  greeting: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
  },
  heroTagline: {
    fontSize: THEME.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },

  // Stats bar (overlaps hero)
  statsBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: -28,
    marginBottom: 24,
    alignItems: 'center',
    ...THEME.shadow.medium,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: THEME.colors.border,
  },
  statLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },
  statValue: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  // Ad section
  sectionHeader: {
    marginBottom: 16,
    gap: 4,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
  },
  sectionSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  adsContainer: {
    gap: 4,
    marginBottom: 32,
  },

  // Buy data section
  buySection: {
    gap: 8,
    marginBottom: 8,
  },
  buySectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  buySectionSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  buyCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 16,
    gap: 8,
    ...THEME.shadow.small,
  },
  buyFieldLabel: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.text,
  },
  planRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  planChip: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  planChipSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primarySurface,
  },
  planChipLabel: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  planChipLabelSelected: { color: THEME.colors.primary },
  planChipPrice: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  planChipPriceSelected: { color: THEME.colors.primary },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.input,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    height: 50,
    gap: 8,
  },
  phoneFlag: { fontSize: 18 },
  phoneInput: {
    flex: 1,
    fontSize: THEME.fontSize.base,
    color: THEME.colors.text,
  },
  buyBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buyBtnDisabled: {
    opacity: 0.4,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.bold,
    fontSize: THEME.fontSize.base,
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
