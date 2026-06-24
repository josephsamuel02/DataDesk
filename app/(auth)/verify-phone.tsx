import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { THEME } from '../../constants/theme';
import { Logo } from '../../components/Logo';

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60;

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode?: string }>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_COUNTDOWN);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Countdown timer
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  function handleOtpChange(value: string, index: number) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  }

  async function handleVerify() {
    const token = otp.join('');
    if (token.length < OTP_LENGTH) {
      setError('Please enter all 6 digits of your OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: phone!,
        token,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      // Verification successful — root layout will redirect to tabs
    } catch (err: any) {
      setError(err.message?.includes('Token has expired')
        ? 'OTP expired. Please request a new one.'
        : (err.message ?? 'Verification failed. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: phone! });
      if (error) throw error;
      setResendTimer(RESEND_COUNTDOWN);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message ?? 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  }

  const maskedPhone = phone
    ? `${phone.slice(0, 7)}****${phone.slice(-3)}`
    : 'your phone';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Logo size={28} variant="color" />
              <Text style={styles.appName}>Data Desk</Text>
            </View>
            <Text style={styles.title}>Verify Your Phone</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.phoneDisplay}>{maskedPhone}</Text>
            </Text>
          </View>

          {/* OTP boxes */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                  error ? styles.otpBoxError : null,
                ]}
                value={digit}
                onChangeText={(val) => handleOtpChange(val, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, loading && styles.btnDisabled]}
            onPress={handleVerify}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify Phone ✓</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                Resend in <Text style={styles.timerNumber}>{resendTimer}s</Text>
              </Text>
            )}
          </View>

          {/* Back link */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>← Change phone number</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 60,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  appName: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },
  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneDisplay: {
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.card,
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    textAlign: 'center',
    ...THEME.shadow.small,
  },
  otpBoxFilled: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primarySurface,
  },
  otpBoxError: {
    borderColor: THEME.colors.error,
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: THEME.fontSize.sm,
    textAlign: 'center',
  },
  verifyBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.button,
    width: '100%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadow.large,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
  },
  resendRow: {
    alignItems: 'center',
  },
  resendLink: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semiBold,
  },
  resendTimer: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
  },
  timerNumber: {
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  backBtn: {
    marginTop: 8,
  },
  backText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
});
