import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { THEME } from '../../constants/theme';
import { Logo } from '../../components/Logo';
import { AuthHero } from '../../components/AuthHero';
import {
  SUPPORTED_COUNTRIES,
  OTHER_COUNTRY_CODE,
  Country,
  formatPhoneForCountry,
  detectCountryFromPhone,
} from '../../constants/countries';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [phone, setPhone] = useState('');
  // Default to the first supported country (Nigeria); `null` means "Other".
  const [country, setCountry] = useState<Country | null>(SUPPORTED_COUNTRIES[0]);
  const [countryModal, setCountryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    phone?: string;
    general?: string;
  }>({});

  const isSupported = !!country;

  function validateEmail(val: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  async function handleRegister() {
    const newErrors: typeof errors = {};
    if (!validateEmail(email)) newErrors.email = 'Enter a valid email address';
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    // Resolve the phone number based on the chosen country.
    let formattedPhone: string | null = null;
    const phoneDigits = phone.replace(/\D/g, '');
    if (country) {
      if (!phoneDigits) {
        newErrors.phone = 'Enter your phone number';
      } else {
        formattedPhone = formatPhoneForCountry(phone, country);
        if (!formattedPhone) {
          newErrors.phone = `Enter a valid ${country.name} phone number`;
        }
      }
    } else if (phoneDigits) {
      // Unsupported country — store whatever they entered, in international form.
      formattedPhone = `+${phoneDigits}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    const countryCode = country ? country.code : OTHER_COUNTRY_CODE;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            username: username.trim() || null,
            phone_number: formattedPhone,
            country: countryCode,
            referral_code: referralCode.trim().toUpperCase() || null,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Insert profile — best-effort; the DB trigger also creates the row.
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email.trim().toLowerCase(),
          username: username.trim() || null,
          phone_number: formattedPhone,
          country: countryCode,
          points: 0,
        });

        if (profileError && profileError.code !== '23505') {
          console.warn('Profile insert error:', profileError.message);
        }

        // If email confirmation is required, show the check-email UI
        if (!data.session) {
          setEmailSent(true);
        }
        // If email confirmation is disabled in Supabase Dashboard,
        // onAuthStateChange in root layout will redirect automatically
      }
    } catch (err: any) {
      const msg = err.message ?? '';
      if (msg.toLowerCase().includes('already registered')) {
        setErrors({ email: 'This email is already registered. Try signing in.' });
      } else {
        setErrors({ general: msg || 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Post-signup "check your email" view ─────────────────────────────────────
  if (emailSent) {
    return (
      <View style={[styles.root, styles.confirmRoot, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.confirmCard}>
          <View style={styles.confirmBadge}>
            <Ionicons name="mail-unread" size={36} color={THEME.colors.primary} />
          </View>
          <View style={styles.brandRowSmall}>
            <Logo size={16} variant="color" />
            <Text style={styles.appNameSmall}>Data Desk</Text>
          </View>
          <Text style={styles.confirmTitle}>Check your inbox</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.confirmEmail}>{email.trim().toLowerCase()}</Text>
            {'\n\n'}Tap the link to activate your account, then come back to sign in.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.85}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.ctaBtnText}>Go to Sign In</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEmailSent(false)} style={styles.resendLink}>
            <Text style={styles.resendLinkText}>← Use a different email</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHero
            title="Create your account"
            subtitle="Watch ads, earn points, get free data"
          />

          <View style={styles.body}>
            <View style={styles.formCard}>
              {errors.general && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={THEME.colors.error} />
                  <Text style={styles.errorBannerText}>{errors.general}</Text>
                </View>
              )}

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[styles.inputRow, errors.email && styles.inputError]}>
                  <Ionicons name="mail-outline" size={18} color={THEME.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={THEME.colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                    }}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputRow, errors.password && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={18} color={THEME.colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Min 8 characters"
                    placeholderTextColor={THEME.colors.textSecondary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={THEME.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Phone number with country */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={[styles.phoneWrap, errors.phone && styles.inputError]}>
                  <TouchableOpacity
                    style={styles.countryBtn}
                    onPress={() => setCountryModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.countryFlag}>{country?.flag ?? '🌍'}</Text>
                    <Text style={styles.countryCode}>{country?.dialCode ?? '+'}</Text>
                    <Ionicons name="chevron-down" size={14} color={THEME.colors.textSecondary} />
                  </TouchableOpacity>
                  <View style={styles.phoneDivider} />
                  <TextInput
                    style={styles.phoneInput}
                    placeholder={country ? 'Phone number' : 'Country code + number'}
                    placeholderTextColor={THEME.colors.textSecondary}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(t) => {
                      setPhone(t);
                      if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                      // Auto-detect country when an international number is entered.
                      if (t.trim().startsWith('+')) {
                        const detected = detectCountryFromPhone(t);
                        if (detected) setCountry(detected);
                      }
                    }}
                  />
                </View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                {!isSupported && (
                  <View style={styles.noticeBanner}>
                    <Ionicons name="information-circle" size={18} color={THEME.colors.primary} />
                    <Text style={styles.noticeText}>
                      Data buying isn&apos;t available in your country yet. You can still
                      register and earn points by watching ads.
                    </Text>
                  </View>
                )}
              </View>

              {/* Username (optional) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Username <Text style={styles.optional}>(optional)</Text>
                </Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color={THEME.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. samuel_ng"
                    placeholderTextColor={THEME.colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={username}
                    onChangeText={setUsername}
                  />
                </View>
              </View>

              {/* Referral code (optional) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Referral Code <Text style={styles.optional}>(optional)</Text>
                </Text>
                <View style={styles.inputRow}>
                  <Ionicons name="gift-outline" size={18} color={THEME.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter a friend's code"
                    placeholderTextColor={THEME.colors.textSecondary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    value={referralCode}
                    onChangeText={setReferralCode}
                  />
                </View>
                <Text style={styles.optional}>
                  Your friend gets 50 points when you sign up.
                </Text>
              </View>

              {/* CTA */}
              <TouchableOpacity
                style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
                onPress={handleRegister}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.ctaBtnText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.termsText}>
                By creating an account you agree to use Data Desk responsibly.
              </Text>
            </View>

            {/* Footer link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country picker */}
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
            <Text style={styles.modalTitle}>Select your country</Text>
            {SUPPORTED_COUNTRIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={styles.countryRow}
                onPress={() => {
                  setCountry(c);
                  setCountryModal(false);
                  setErrors((e) => ({ ...e, phone: undefined }));
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.countryRowFlag}>{c.flag}</Text>
                <Text style={styles.countryRowName}>{c.name}</Text>
                <Text style={styles.countryRowCode}>{c.dialCode}</Text>
                {country?.code === c.code && (
                  <Ionicons name="checkmark-circle" size={20} color={THEME.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.countryRow}
              onPress={() => {
                setCountry(null);
                setCountryModal(false);
                setErrors((e) => ({ ...e, phone: undefined }));
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.countryRowFlag}>🌍</Text>
              <Text style={styles.countryRowName}>Other (not supported yet)</Text>
              {!country && (
                <Ionicons name="checkmark-circle" size={20} color={THEME.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  body: {
    paddingHorizontal: 20,
    marginTop: -32,
  },

  // Form
  formCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 22,
    gap: 16,
    ...THEME.shadow.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.errorSurface,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.error,
    padding: 12,
  },
  errorBannerText: { color: THEME.colors.error, fontSize: THEME.fontSize.sm, flex: 1 },
  fieldGroup: { gap: 7 },
  label: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.text,
  },
  optional: { fontWeight: THEME.fontWeight.regular, color: THEME.colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.input,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    height: 54,
    gap: 10,
  },
  inputError: { borderColor: THEME.colors.error },
  input: { flex: 1, fontSize: THEME.fontSize.base, color: THEME.colors.text },
  eyeBtn: { padding: 4 },

  // Phone + country
  phoneWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.input,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    height: 54,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  countryFlag: { fontSize: 18 },
  countryCode: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.text,
  },
  phoneDivider: {
    width: 1,
    height: 26,
    backgroundColor: THEME.colors.border,
  },
  phoneInput: {
    flex: 1,
    fontSize: THEME.fontSize.base,
    color: THEME.colors.text,
    paddingHorizontal: 12,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: THEME.colors.primarySurface,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  noticeText: {
    flex: 1,
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.text,
    lineHeight: 17,
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
  errorText: { fontSize: THEME.fontSize.xs, color: THEME.colors.error, marginLeft: 4 },
  ctaBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.button,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...THEME.shadow.large,
  },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaBtnText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  footerText: { fontSize: THEME.fontSize.base, color: THEME.colors.textSecondary },
  footerLink: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  // Confirmation view
  confirmRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    ...THEME.shadow.medium,
  },
  confirmBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandRowSmall: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appNameSmall: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },
  confirmTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmEmail: {
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },
  resendLink: { marginTop: 4 },
  resendLinkText: { fontSize: THEME.fontSize.sm, color: THEME.colors.textSecondary },
});
