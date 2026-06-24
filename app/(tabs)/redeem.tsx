import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Profile } from '../../lib/supabase';
import { deductPoints } from '../../lib/adService';
import { ensureProfile } from '../../lib/profileService';
import { rechargeData } from '../../lib/dataVendorService';
import { THEME } from '../../constants/theme';
import { DATA_PLANS, Network } from '../../constants/networks';
import {
  SUPPORTED_COUNTRIES,
  getCountryByCode,
  formatPhoneForCountry,
  detectCountryFromPhone,
  Country,
} from '../../constants/countries';
import { Ionicons } from '@expo/vector-icons';
import { NetworkSelector } from '../../components/NetworkSelector';
import { DataPackageCard } from '../../components/DataPackageCard';
import { PointsBadge } from '../../components/PointsBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { Logo } from '../../components/Logo';
import { PinModal } from '../../components/PinModal';
import { useDialog } from '../../components/DialogProvider';

export default function RedeemScreen() {
  const dialog = useDialog();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<(typeof DATA_PLANS)[0] | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  // The country the recharge is FOR (based on the entered phone number),
  // independent of where the user themselves registered from.
  const [country, setCountry] = useState<Country>(SUPPORTED_COUNTRIES[0]);
  const [countryModal, setCountryModal] = useState(false);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const prof = await ensureProfile();
    if (prof) {
      setProfile(prof);
      // Default the recharge country to the user's own, if it's supported.
      const ownCountry = getCountryByCode(prof.country);
      if (ownCountry) setCountry(ownCountry);
      if (prof.phone_number && ownCountry) {
        // Show the national number (strip the dial code) for editing.
        setPhone(prof.phone_number.replace(ownCountry.dialCode, ''));
      } else if (prof.phone_number) {
        setPhone(prof.phone_number);
      }
    }
  }

  const networks = country.networks;

  function changeCountry(c: Country) {
    setCountry(c);
    setCountryModal(false);
    setSelectedNetwork(null);
    setSelectedPlan(null);
    setPhoneError('');
  }

  useEffect(() => {
    setLoading(true);
    loadProfile().finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }

  function validatePhone(raw: string): string | null {
    return formatPhoneForCountry(raw, country);
  }

  // Validate the form, then require the transaction PIN before charging points.
  function handleRedeem() {
    if (!selectedNetwork) {
      dialog.alert({ title: 'Select Network', message: 'Please choose a network to continue.', variant: 'warning' });
      return;
    }
    if (!selectedPlan) {
      dialog.alert({ title: 'Select Plan', message: 'Please choose a data plan to continue.', variant: 'warning' });
      return;
    }
    const formattedPhone = validatePhone(phone);
    if (!formattedPhone) {
      setPhoneError(`Enter a valid ${country.name} phone number`);
      return;
    }

    if ((profile?.points ?? 0) < selectedPlan.points) {
      dialog.alert({
        title: 'Insufficient Points',
        message: `You need ${selectedPlan.points - (profile?.points ?? 0)} more points for this plan.`,
        variant: 'warning',
      });
      return;
    }

    // All good — ask for the transaction PIN (creates one on first use).
    setPinVisible(true);
  }

  // Runs only after the PIN has been verified/created successfully.
  async function executeRedeem() {
    setPinVisible(false);
    if (!selectedNetwork || !selectedPlan) return;
    const formattedPhone = validatePhone(phone);
    if (!formattedPhone) return;

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deduct points first
      const deductResult = await deductPoints(user.id, selectedPlan.points);
      if (!deductResult.success) throw new Error(deductResult.error ?? 'Could not deduct points');

      // Create recharge request
      const { data: rechargeRecord, error: rechargeError } = await supabase
        .from('recharge_requests')
        .insert({
          user_id: user.id,
          phone_number: formattedPhone,
          network: selectedNetwork.id,
          data_plan: selectedPlan.label,
          points_spent: selectedPlan.points,
          status: 'pending',
        })
        .select()
        .single();

      if (rechargeError) throw rechargeError;

      // Call data vendor (routed by the recharge number's country)
      const vendorResult = await rechargeData({
        phone: formattedPhone,
        countryCode: country.code,
        network: selectedNetwork.id,
        dataPlan: selectedPlan.id,
        requestId: rechargeRecord.id,
      });

      // Update status
      await supabase
        .from('recharge_requests')
        .update({
          status: vendorResult.success ? 'processing' : 'failed',
        })
        .eq('id', rechargeRecord.id);

      // Update local profile points
      setProfile((p) => p ? { ...p, points: deductResult.newTotal } : p);

      if (vendorResult.success) {
        showToast('🎉 Data Desk is processing your recharge!');
        setSelectedPlan(null);
        setSelectedNetwork(null);
      } else {
        dialog.alert({ title: 'Recharge Failed', message: vendorResult.message, variant: 'error' });
        // Re-credit points on failure
        await supabase.from('profiles').update({ points: profile?.points ?? 0 }).eq('id', user.id);
        setProfile((p) => p ? { ...p, points: p.points } : p);
      }
    } catch (err: any) {
      dialog.alert({
        title: 'Something went wrong',
        message: err.message ?? 'Please try again.',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const points = profile?.points ?? 0;
  const nextTier = DATA_PLANS.find((p) => p.points > points);
  const nextTierPoints = nextTier?.points ?? 700;

  const canAfford = selectedPlan ? points >= selectedPlan.points : false;
  const shortfall = selectedPlan ? Math.max(0, selectedPlan.points - points) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadProfile(); setRefreshing(false); }}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Logo size={15} variant="color" />
            <Text style={styles.screenTitle}>Data Desk</Text>
          </View>
          <Text style={styles.pageTitle}>Redeem Data</Text>
        </View>

        {/* Points summary */}
        {loading ? (
          <View style={[styles.pointsCard, { alignItems: 'center', gap: 8 }]}>
            <ActivityIndicator color={THEME.colors.primary} />
          </View>
        ) : (
          <View style={styles.pointsCard}>
            <View style={styles.pointsTopRow}>
              <View>
                <Text style={styles.pointsLabel}>Available Points</Text>
                <View style={styles.bigPointsRow}>
                  <Text style={styles.bigPoints}>{points.toLocaleString()}</Text>
                  <Text style={styles.bigPtsSuffix}> pts</Text>
                </View>
              </View>
              <PointsBadge points={points} size="large" />
            </View>
            <ProgressBar
              current={Math.min(points, nextTierPoints)}
              target={nextTierPoints}
              label={`Progress to ${nextTier?.label ?? '10GB'} (${nextTierPoints} pts)`}
              color={THEME.colors.primary}
              height={10}
            />
          </View>
        )}

        {!loading && (
          <>
            {/* Recharge number + country */}
            <View style={styles.formSection}>
              <Text style={styles.fieldTitle}>1. Recharge Number</Text>
              <View style={[styles.phoneRow, phoneError ? styles.phoneRowError : null]}>
                <TouchableOpacity
                  style={styles.countryChip}
                  onPress={() => setCountryModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{country.flag}</Text>
                  <Text style={styles.dialCode}>{country.dialCode}</Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.chipDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Phone number"
                  placeholderTextColor={THEME.colors.textSecondary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setPhoneError('');
                    // Auto-switch country if an international number is typed.
                    if (t.trim().startsWith('+')) {
                      const detected = detectCountryFromPhone(t);
                      if (detected && detected.code !== country.code) changeCountry(detected);
                    }
                  }}
                />
              </View>
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
              <Text style={styles.phoneHint}>
                Buy for any supported country — just pick the number&apos;s country
              </Text>
            </View>

            {/* Network selector */}
            <View style={styles.formSection}>
              <Text style={styles.fieldTitle}>2. Select Network</Text>
              <NetworkSelector
                networks={networks}
                selected={selectedNetwork?.id ?? null}
                onSelect={(n) => {
                  setSelectedNetwork(n);
                  setSelectedPlan(null);
                }}
              />
            </View>

            {/* Data plan grid */}
            <View style={styles.formSection}>
              <Text style={styles.fieldTitle}>3. Choose Data Plan</Text>
              {!selectedNetwork ? (
                <View style={styles.emptyPlanMsg}>
                  <Text style={styles.emptyPlanText}>Select a network first to see available plans</Text>
                </View>
              ) : (
                <View style={styles.planGrid}>
                  {DATA_PLANS.map((plan) => (
                    <DataPackageCard
                      key={plan.id}
                      pkg={plan}
                      selected={selectedPlan?.id === plan.id}
                      userPoints={points}
                      onSelect={(p) => setSelectedPlan(p)}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Redeem summary */}
            {selectedPlan && (
              <View style={styles.redeemSummary}>
                <Text style={styles.redeemSummaryText}>
                  Redeeming <Text style={styles.redeemBold}>{selectedPlan.label}</Text> on{' '}
                  <Text style={styles.redeemBold}>{selectedNetwork?.name}</Text>
                </Text>
                <Text style={styles.redeemPointsCost}>
                  Cost: {selectedPlan.points} pts •{' '}
                  {canAfford
                    ? `You'll have ${points - selectedPlan.points} pts left`
                    : `Need ${shortfall} more pts`}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.redeemBtn,
                (!canAfford || !selectedNetwork || !selectedPlan || submitting) && styles.redeemBtnDisabled,
              ]}
              onPress={handleRedeem}
              activeOpacity={0.85}
              disabled={!canAfford || !selectedNetwork || !selectedPlan || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.redeemBtnText}>
                  {!selectedPlan
                    ? 'Select a plan to redeem'
                    : !canAfford
                      ? `Need ${shortfall} more points`
                      : `🎁 Redeem ${selectedPlan.label} Data`}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Toast */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      {/* Transaction PIN gate */}
      <PinModal
        visible={pinVisible}
        mode="auto"
        onClose={() => setPinVisible(false)}
        onSuccess={executeRedeem}
      />

      {/* Recharge country picker */}
      <Modal
        visible={countryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCountryModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Buy data for…</Text>
            {SUPPORTED_COUNTRIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={styles.countryRow}
                onPress={() => changeCountry(c)}
                activeOpacity={0.7}
              >
                <Text style={styles.countryRowFlag}>{c.flag}</Text>
                <Text style={styles.countryRowName}>{c.name}</Text>
                <Text style={styles.countryRowCode}>{c.dialCode}</Text>
                {country.code === c.code && (
                  <Ionicons name="checkmark-circle" size={20} color={THEME.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 20 },

  header: { gap: 2 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  screenTitle: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.primary,
  },
  pageTitle: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
  },

  // Points card
  pointsCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 20,
    gap: 14,
    ...THEME.shadow.medium,
  },
  pointsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  bigPointsRow: { flexDirection: 'row', alignItems: 'baseline' },
  bigPoints: {
    fontSize: THEME.fontSize.hero,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
  },
  bigPtsSuffix: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textSecondary,
  },

  // Form sections
  formSection: { gap: 10 },
  fieldTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.input,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
    ...THEME.shadow.small,
  },
  phoneRowError: { borderColor: THEME.colors.error },
  flag: { fontSize: 18 },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.border,
    marginHorizontal: 10,
  },
  dialCode: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.text,
  },
  phoneInput: {
    flex: 1,
    fontSize: THEME.fontSize.base,
    color: THEME.colors.text,
  },

  // Country modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
    marginBottom: 12,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  countryRowFlag: { fontSize: 22 },
  countryRowName: {
    flex: 1,
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },
  countryRowCode: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  phoneHint: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginLeft: 4,
  },
  errorText: { fontSize: THEME.fontSize.xs, color: THEME.colors.error },

  // Plan grid
  emptyPlanMsg: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
  },
  emptyPlanText: { color: THEME.colors.textSecondary, fontSize: THEME.fontSize.sm },
  planGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // Redeem summary
  redeemSummary: {
    backgroundColor: THEME.colors.primarySurface,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
    gap: 4,
  },
  redeemSummaryText: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.text,
  },
  redeemBold: { fontWeight: THEME.fontWeight.bold, color: THEME.colors.primary },
  redeemPointsCost: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  // Redeem button
  redeemBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.button,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadow.large,
  },
  redeemBtnDisabled: { opacity: 0.5 },
  redeemBtnText: {
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.bold,
    fontSize: THEME.fontSize.md,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: THEME.colors.success,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...THEME.shadow.large,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.bold,
    fontSize: THEME.fontSize.base,
    textAlign: 'center',
  },
});
