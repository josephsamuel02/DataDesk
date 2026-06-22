import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase, Profile } from '../../lib/supabase';
import { THEME } from '../../constants/theme';
import { Logo } from '../../components/Logo';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [totalDataRedeemed, setTotalDataRedeemed] = useState(0);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('points_transactions').select('points_earned').eq('user_id', user.id),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      setUsername(profileRes.data.username ?? '');
      setEmail(profileRes.data.email ?? '');
      setPhone(profileRes.data.phone_number?.replace('+234', '0') ?? '');
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
      Alert.alert('Success', 'Profile updated successfully on Data Desk!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `${user.id}/avatar.${ext}`;

      // Read file as blob for upload
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setProfile((p) => p ? { ...p, avatar_url: urlData.publicUrl } : p);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message ?? 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Data Desk?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ],
    );
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
            <Logo size={15} variant="color" />
            <Text style={styles.screenBrand}>Data Desk</Text>
          </View>
          <Text style={styles.pageTitle}>My Profile</Text>
        </View>

        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarUpload} disabled={uploading}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(profile?.username ?? profile?.email ?? 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.avatarEditIcon}>📷</Text>
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
          <View style={styles.fieldRow}>
            <Text style={styles.fieldIcon}>✉️</Text>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <Text style={styles.fieldValue}>{profile?.email ?? 'Not set'}</Text>
            </View>
            {profile?.email && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          {/* Phone (optional — needed for recharges) */}
          {!editMode && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldIcon}>📱</Text>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <Text style={styles.fieldValue}>
                  {profile?.phone_number ?? (
                    <Text style={{ color: THEME.colors.textSecondary, fontStyle: 'italic' }}>
                      Not set — needed for data recharges
                    </Text>
                  )}
                </Text>
              </View>
            </View>
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
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldIcon}>👤</Text>
                  <View style={styles.fieldContent}>
                    <Text style={styles.fieldLabel}>Username</Text>
                    <Text style={styles.fieldValue}>@{profile.username}</Text>
                  </View>
                </View>
              )}
              {profile?.email && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldIcon}>✉️</Text>
                  <View style={styles.fieldContent}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <Text style={styles.fieldValue}>{profile.email}</Text>
                  </View>
                </View>
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

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
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

  // Avatar
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: THEME.colors.primary,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: THEME.colors.primary,
  },
  avatarInitial: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.extraBold,
    color: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.background,
  },
  avatarEditIcon: { fontSize: 14 },
  profileName: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  memberSince: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    paddingVertical: 16,
    alignItems: 'center',
    ...THEME.shadow.small,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: THEME.fontSize.xl,
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
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  fieldIcon: { fontSize: 18 },
  fieldContent: { flex: 1, gap: 2 },
  fieldLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },
  fieldValue: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },
  verifiedBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.success,
    fontWeight: THEME.fontWeight.semiBold,
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

  // Sign out
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: THEME.colors.error,
    borderRadius: THEME.borderRadius.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
