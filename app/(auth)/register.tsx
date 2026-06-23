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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { THEME } from '../../constants/theme';
import { Logo } from '../../components/Logo';
import { AuthHero } from '../../components/AuthHero';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  function validateEmail(val: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  async function handleRegister() {
    const newErrors: typeof errors = {};
    if (!validateEmail(email)) newErrors.email = 'Enter a valid email address';
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { username: username.trim() || null },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Insert profile — phone_number is optional at registration
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email.trim().toLowerCase(),
          username: username.trim() || null,
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
