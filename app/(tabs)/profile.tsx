import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Profile } from '../../lib/supabase';
import { THEME } from '../../constants/theme';
import { Logo } from '../../components/Logo';
import { PinModal } from '../../components/PinModal';
import { hasPin } from '../../lib/pinService';
import { ensureProfile } from '../../lib/profileService';
import { useDialog } from '../../components/DialogProvider';
import { Avatar } from '../../components/Avatar';
import { AvatarPickerModal } from '../../components/AvatarPickerModal';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Decode a base64 string into raw bytes. Uploading bytes (instead of a blob from
// fetch(localUri)) is the reliable way to send files to Supabase Storage on React
// Native, where fetch/blob uploads commonly fail with "Network request failed".
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_TABLE = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < B64_CHARS.length; i++) t[B64_CHARS.charCodeAt(i)] = i;
  return t;
})();

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  let length = clean.length * 0.75;
  if (clean.endsWith('==')) length -= 2;
  else if (clean.endsWith('=')) length -= 1;

  const bytes = new Uint8Array(length);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = B64_TABLE[clean.charCodeAt(i)];
    const e2 = B64_TABLE[clean.charCodeAt(i + 1)];
    const e3 = B64_TABLE[clean.charCodeAt(i + 2)];
    const e4 = B64_TABLE[clean.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (clean.charCodeAt(i + 2) !== 61) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (clean.charCodeAt(i + 3) !== 61) bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes;
}

function InfoRow({
  icon,
  color,
  surface,
  label,
  value,
  trailing,
}: {
  icon: IoniconName;
  color: string;
  surface: string;
  label: string;
  value: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={[styles.fieldBubble, { backgroundColor: surface }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {typeof value === 'string' ? <Text style={styles.fieldValue}>{value}</Text> : value}
      </View>
      {trailing}
    </View>
  );
}

export default function ProfileScreen() {
  const dialog = useDialog();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [totalDataRedeemed, setTotalDataRedeemed] = useState(0);

  // Transaction PIN
  const [pinExists, setPinExists] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'create' | 'verify'>('create');
  const [changingPin, setChangingPin] = useState(false);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [prof, statsRes] = await Promise.all([
      ensureProfile(),
      supabase.from('points_transactions').select('points_earned').eq('user_id', user.id),
    ]);

    if (prof) {
      setProfile(prof);
      setUsername(prof.username ?? '');
      setEmail(prof.email ?? '');
      setPhone(prof.phone_number?.replace('+234', '0') ?? '');
    }

    if (statsRes.data) {
      const total = statsRes.data.reduce((sum: number, t: any) => sum + t.points_earned, 0);
      setTotalPointsEarned(total);
    }

    const { data: rechargesData } = await supabase
      .from('recharge_requests')
      .select('data_plan')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    setTotalDataRedeemed(rechargesData?.length ?? 0);

    setPinExists(await hasPin());
  }

  function openPinFlow() {
    if (pinExists) {
      // Changing an existing PIN: verify current first, then create a new one.
      setChangingPin(true);
      setPinModalMode('verify');
    } else {
      setChangingPin(false);
      setPinModalMode('create');
    }
    setPinModalVisible(true);
  }

  function handlePinSuccess() {
    // In the "change" flow, the first success is the verify step → switch to create.
    if (pinModalMode === 'verify' && changingPin) {
      setPinModalMode('create');
      return;
    }
    setPinModalVisible(false);
    const wasUpdate = pinExists;
    setPinExists(true);
    setChangingPin(false);
    dialog.alert({
      title: 'Transaction PIN',
      message: wasUpdate
        ? 'Your transaction PIN has been updated.'
        : 'Your transaction PIN has been set.',
      variant: 'success',
    });
  }

  async function initialize() {
    setLoading(true);
    await loadProfile();
    setLoading(false);
  }

  useEffect(() => { initialize(); }, []);

  async function handleSaveProfile() {
    const newErrors: Record<string, string> = {};
    if (password && password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (password && password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSaving(true);
    setErrors({});

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Format phone number before saving
      let formattedPhone: string | null = null;
      if (phone.trim()) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('0')) formattedPhone = `+234${digits.slice(1)}`;
        else if (digits.length === 10) formattedPhone = `+234${digits}`;
        else if (digits.length === 13 && digits.startsWith('234')) formattedPhone = `+${digits}`;
        else formattedPhone = phone.trim();
      }

      // Update profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: username || null, email: email || null, phone_number: formattedPhone })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // Update auth email if changed
      if (email && email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) console.warn('Email update:', emailError.message);
      }

      // Update password if provided
      if (password) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      }

      await loadProfile();
      setPassword('');
      setConfirmPassword('');
      setEditMode(false);
      dialog.alert({
        title: 'Profile Updated',
        message: 'Your changes have been saved on Data Desk!',
        variant: 'success',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'Update Failed',
        message: err.message ?? 'Could not update profile.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectPreset(presetId: string) {
    setAvatarPickerVisible(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const value = `preset:${presetId}`;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: value })
        .eq('id', user.id);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, avatar_url: value } : p));
    } catch (err: any) {
      dialog.alert({
        title: 'Could not set avatar',
        message: err.message ?? 'Please try again.',
        variant: 'error',
      });
    }
  }

  async function handleAvatarUpload() {
    setAvatarPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      dialog.alert({
        title: 'Permission Required',
        message: 'Please allow access to your photo library to upload a picture.',
        variant: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const asset = result.assets[0];
      if (!asset.base64) throw new Error('Could not read the selected image.');

      const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
      const contentType = asset.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const fileName = `${user.id}/avatar.${ext}`;

      const bytes = base64ToUint8Array(asset.base64);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, bytes, { upsert: true, contentType });

      if (uploadError) throw uploadError;

      // Cache-bust the public URL so the new image shows immediately
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setProfile((p) => p ? { ...p, avatar_url: publicUrl } : p);
    } catch (err: any) {
      dialog.alert({
        title: 'Upload Failed',
        message: err.message ?? 'Could not upload photo.',
        variant: 'error',
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    dialog.alert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of Data Desk?',
      variant: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ],
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading your Data Desk profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
    : 'Recently';

  const displayName = profile?.username ?? profile?.email?.split('@')[0] ?? 'Data Desk User';

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
            <Logo size={26} variant="color" />
            <Text style={styles.screenBrand}>Data Desk</Text>
          </View>
          <Text style={styles.pageTitle}>My Profile</Text>
        </View>

        {/* Avatar hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroDecorLg} pointerEvents="none" />
          <View style={styles.heroDecorSm} pointerEvents="none" />

          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setAvatarPickerVisible(true)}
            disabled={uploading}
            activeOpacity={0.85}
          >
            <Avatar
              value={profile?.avatar_url}
              size={72}
              initial={(profile?.username ?? profile?.email ?? 'U')[0]}
              borderColor="rgba(255,255,255,0.5)"
              borderWidth={2.5}
            />
            <View style={styles.avatarEditBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color={THEME.colors.primary} />
              ) : (
                <Ionicons name="camera" size={13} color={THEME.colors.primary} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{profile?.points ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalPointsEarned}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalDataRedeemed}</Text>
            <Text style={styles.statLabel}>Recharges</Text>
          </View>
        </View>

        {/* Profile info / edit form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Account Details</Text>
            {!editMode && (
              <TouchableOpacity onPress={() => setEditMode(true)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Email (read-only primary) */}
          <InfoRow
            icon="mail"
            color={THEME.category.blue.color}
            surface={THEME.category.blue.surface}
            label="Email Address"
            value={
              <Text style={[styles.fieldValue, styles.emailValue]} numberOfLines={1}>
                {profile?.email ?? 'Not set'}
              </Text>
            }
            trailing={
              profile?.email ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={THEME.colors.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : undefined
            }
          />

          {/* Phone (optional — needed for recharges) */}
          {!editMode && (
            <InfoRow
              icon="call"
              color={THEME.category.green.color}
              surface={THEME.category.green.surface}
              label="Phone Number"
              value={
                profile?.phone_number ?? (
                  <Text style={[styles.fieldValue, styles.fieldValueMuted]}>
                    Not set — needed for data recharges
                  </Text>
                )
              }
            />
          )}

          {editMode ? (
            <>
              {/* Username edit */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. samuel_ng"
                  placeholderTextColor={THEME.colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>

              {/* Phone number edit */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Phone Number <Text style={styles.optional}>(required for data recharges)</Text>
                </Text>
                <View style={styles.phoneEditRow}>
                  <Text style={styles.phoneFlag}>🇳🇬</Text>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0, height: 'auto' as any }]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="08012345678"
                    placeholderTextColor={THEME.colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Email edit */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={THEME.colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password <Text style={styles.optional}>(leave blank to keep current)</Text></Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined! })); }}
                  placeholder="Min 8 characters"
                  placeholderTextColor={THEME.colors.textSecondary}
                  secureTextEntry
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: undefined! })); }}
                  placeholder="Confirm new password"
                  placeholderTextColor={THEME.colors.textSecondary}
                  secureTextEntry
                />
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>

              {/* Save / Cancel */}
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setEditMode(false);
                    setErrors({});
                    setUsername(profile?.username ?? '');
                    setEmail(profile?.email ?? '');
                    setPhone(profile?.phone_number?.replace('+234', '0') ?? '');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {profile?.username && (
                <InfoRow
                  icon="at"
                  color={THEME.category.purple.color}
                  surface={THEME.category.purple.surface}
                  label="Username"
                  value={`@${profile.username}`}
                />
              )}
              {!profile?.username && !profile?.email && (
                <TouchableOpacity onPress={() => setEditMode(true)}>
                  <Text style={styles.addInfoPrompt}>
                    + Tap Edit to add username and email to your Data Desk account
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Security */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security</Text>
          <TouchableOpacity style={styles.securityRow} onPress={openPinFlow} activeOpacity={0.7}>
            <View style={styles.securityIcon}>
              <Ionicons name="lock-closed" size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldValue}>Transaction PIN</Text>
              <Text style={styles.fieldLabel}>
                {pinExists
                  ? 'Required to authorize every purchase'
                  : 'Set a 4-digit PIN to secure your purchases'}
              </Text>
            </View>
            <View style={styles.securityAction}>
              <Text style={styles.securityActionText}>{pinExists ? 'Change' : 'Set'}</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={THEME.colors.error} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Transaction PIN setup / change */}
      <AvatarPickerModal
        visible={avatarPickerVisible}
        selectedValue={profile?.avatar_url}
        onClose={() => setAvatarPickerVisible(false)}
        onSelectPreset={handleSelectPreset}
        onUpload={handleAvatarUpload}
      />

      <PinModal
        visible={pinModalVisible}
        mode={pinModalMode}
        onClose={() => {
          setPinModalVisible(false);
          setChangingPin(false);
        }}
        onSuccess={handlePinSuccess}
        title={pinModalMode === 'verify' ? 'Enter Current PIN' : undefined}
        subtitle={pinModalMode === 'verify' ? 'Verify your current PIN to change it' : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 16 },

  header: { gap: 2 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  screenBrand: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.primary,
  },
  pageTitle: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
  },

  // Avatar hero
  heroCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.xl,
    paddingTop: 18,
    paddingBottom: 34,
    alignItems: 'center',
    gap: 4,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroDecorSm: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: { position: 'relative', marginBottom: 2 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarInitial: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.primary,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  profileName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
  },
  memberSince: {
    fontSize: THEME.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
  },

  // Stats (overlaps the hero)
  statsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    paddingVertical: 14,
    marginHorizontal: 8,
    marginTop: -24,
    alignItems: 'center',
    ...THEME.shadow.medium,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.primary,
  },
  statLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: THEME.colors.border,
  },

  // Card
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 16,
    gap: 14,
    ...THEME.shadow.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  editBtn: {
    backgroundColor: THEME.colors.primarySurface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editBtnText: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semiBold,
    fontSize: THEME.fontSize.sm,
  },

  // Field rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  fieldBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContent: { flex: 1, gap: 2 },
  fieldLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },
  fieldValue: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.text,
  },
  emailValue: {
    fontSize: THEME.fontSize.sm,
  },
  fieldValueMuted: {
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.regular,
    fontStyle: 'italic',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.successSurface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.success,
    fontWeight: THEME.fontWeight.bold,
  },
  addInfoPrompt: {
    color: THEME.colors.primary,
    fontSize: THEME.fontSize.sm,
    textAlign: 'center',
    paddingVertical: 4,
  },
  phoneEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.input,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  phoneFlag: { fontSize: 18 },

  // Edit form
  inputGroup: { gap: 6 },
  inputLabel: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.text,
  },
  optional: {
    fontWeight: THEME.fontWeight.regular,
    color: THEME.colors.textSecondary,
  },
  input: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.input,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    height: 48,
    fontSize: THEME.fontSize.base,
    color: THEME.colors.text,
  },
  inputError: { borderColor: THEME.colors.error },
  errorText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.error,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: THEME.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  cancelBtnText: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: THEME.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    fontSize: THEME.fontSize.base,
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.bold,
  },

  // Security
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  securityActionText: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semiBold,
    fontSize: THEME.fontSize.sm,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
    borderColor: THEME.colors.error,
    borderRadius: THEME.borderRadius.button,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.errorSurface,
  },
  signOutBtnText: {
    color: THEME.colors.error,
    fontWeight: THEME.fontWeight.bold,
    fontSize: THEME.fontSize.base,
  },

  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
  },
});
