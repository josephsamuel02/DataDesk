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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { THEME } from '../../constants/theme';
import { Logo } from '../../components/Logo';

export default function RegisterScreen() {
  const router = useRouter();
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmEmoji}>📧</Text>
          <Text style={styles.appName}>Data Desk</Text>
          <Text style={styles.confirmTitle}>Check your inbox</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.confirmEmail}>{email.trim().toLowerCase()}</Text>
            {'\n\n'}Click the link to activate your Data Desk account, then come back to sign in.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.ctaBtnText}>Go to Sign In →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEmailSent(false)}
            style={styles.resendLink}
          >
            <Text style={styles.resendLinkText}>← Use a different email</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Logo size={34} variant="color" />
              <Text style={styles.appName}>Data Desk</Text>
            </View>
            <Text style={styles.tagline}>Your Data, Your Way</Text>
            <Text style={styles.headerTitle}>Create your account</Text>
            <Text style={styles.headerSubtitle}>
              Watch ads, earn points, get free data — all on Data Desk
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            {errors.general && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️ {errors.general}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputRow, errors.email && styles.inputError]}>
                <Text style={styles.fieldIcon}>✉️</Text>
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
                <Text style={styles.fieldIcon}>🔒</Text>
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
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Text>{showPassword ? '🙈' : '👁️'}</Text>
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
                <Text style={styles.fieldIcon}>👤</Text>
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
                <ActivityIndicator color={THEME.colors.text} />
              ) : (
                <Text style={styles.ctaBtnText}>Create Account →</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: { paddingTop: 32, paddingBottom: 28, alignItems: 'center', gap: 6 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  logoIcon: { fontSize: 28 },
  appName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.primary,
    letterSpacing: -0.5,
  },
  tagline: { fontSize: THEME.fontSize.sm, color: THEME.colors.textSecondary, letterSpacing: 1 },
  headerTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Form
  formCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 24,
    gap: 16,
    ...THEME.shadow.medium,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.error,
    padding: 12,
  },
  errorBannerText: { color: THEME.colors.error, fontSize: THEME.fontSize.sm },
  fieldGroup: { gap: 6 },
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
    height: 52,
    gap: 10,
  },
  inputError: { borderColor: THEME.colors.error },
  fieldIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: THEME.fontSize.base, color: THEME.colors.text },
  eyeBtn: { padding: 4 },
  errorText: { fontSize: THEME.fontSize.xs, color: THEME.colors.error, marginLeft: 4 },
  ctaBtn: {
    backgroundColor: THEME.colors.accent,
    borderRadius: THEME.borderRadius.button,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...THEME.shadow.medium,
  },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaBtnText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  termsText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: THEME.fontSize.base, color: THEME.colors.textSecondary },
  footerLink: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  // Email-sent confirmation
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  confirmEmoji: { fontSize: 64 },
  confirmTitle: {
    fontSize: THEME.fontSize.xxl,
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
