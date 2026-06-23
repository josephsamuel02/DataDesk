import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { hasPin, setPin, verifyPin, PIN_DIGITS } from '../lib/pinService';

type Resolved = 'auto' | 'create' | 'verify';

interface PinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** 'auto' picks create/verify based on whether a PIN already exists. */
  mode?: Resolved;
  title?: string;
  subtitle?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinModal({
  visible,
  onClose,
  onSuccess,
  mode = 'auto',
  title,
  subtitle,
}: PinModalProps) {
  const [resolvedMode, setResolvedMode] = useState<'create' | 'verify'>('verify');
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter');
  const [entry, setEntry] = useState('');
  const [firstEntry, setFirstEntry] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const reset = useCallback(() => {
    setPhase('enter');
    setEntry('');
    setFirstEntry('');
    setError('');
    setProcessing(false);
  }, []);

  // Decide create vs verify whenever the modal opens
  useEffect(() => {
    if (!visible) return;
    reset();
    if (mode === 'auto') {
      hasPin().then((exists) => setResolvedMode(exists ? 'verify' : 'create'));
    } else {
      setResolvedMode(mode);
    }
  }, [visible, mode, reset]);

  function triggerShake() {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  const handleComplete = useCallback(
    async (pin: string) => {
      if (resolvedMode === 'create') {
        if (phase === 'enter') {
          setFirstEntry(pin);
          setEntry('');
          setPhase('confirm');
          return;
        }
        // confirm phase
        if (pin !== firstEntry) {
          setError('PINs do not match. Try again.');
          triggerShake();
          setEntry('');
          setFirstEntry('');
          setPhase('enter');
          return;
        }
        setProcessing(true);
        const res = await setPin(pin);
        setProcessing(false);
        if (res.success) {
          // Clear entry first so the auto-submit effect can't re-fire onSuccess.
          setEntry('');
          setFirstEntry('');
          setPhase('enter');
          onSuccess();
        } else {
          setError(res.error ?? 'Could not save PIN');
          triggerShake();
          setEntry('');
        }
        return;
      }

      // verify mode
      setProcessing(true);
      const ok = await verifyPin(pin);
      setProcessing(false);
      if (ok) {
        // Clear entry first so the auto-submit effect can't re-fire onSuccess.
        setEntry('');
        onSuccess();
      } else {
        setError('Incorrect PIN. Try again.');
        triggerShake();
        setEntry('');
      }
    },
    [resolvedMode, phase, firstEntry, onSuccess],
  );

  // Auto-submit when the entry is complete
  useEffect(() => {
    if (entry.length === PIN_DIGITS && !processing) {
      handleComplete(entry);
    }
  }, [entry, processing, handleComplete]);

  function press(key: string) {
    if (processing) return;
    setError('');
    if (key === 'del') {
      setEntry((e) => e.slice(0, -1));
    } else if (key !== '') {
      setEntry((e) => (e.length < PIN_DIGITS ? e + key : e));
    }
  }

  const heading =
    title ??
    (resolvedMode === 'create'
      ? phase === 'enter'
        ? 'Create Transaction PIN'
        : 'Confirm Your PIN'
      : 'Enter Transaction PIN');

  const sub =
    subtitle ??
    (resolvedMode === 'create'
      ? phase === 'enter'
        ? `Set a ${PIN_DIGITS}-digit PIN to secure your purchases`
        : 'Re-enter your PIN to confirm'
      : 'Enter your PIN to authorize this purchase');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={24} color={THEME.colors.primary} />
          </View>

          <Text style={styles.title}>{heading}</Text>
          <Text style={styles.subtitle}>{sub}</Text>

          {/* PIN dots */}
          <Animated.View
            style={[
              styles.dotsRow,
              { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] }) }] },
            ]}
          >
            {Array.from({ length: PIN_DIGITS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < entry.length && styles.dotFilled,
                  !!error && styles.dotError,
                ]}
              />
            ))}
          </Animated.View>

          <View style={styles.errorSlot}>
            {processing ? (
              <ActivityIndicator color={THEME.colors.primary} />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {KEYS.map((k, idx) => {
              if (k === '') return <View key={idx} style={styles.keySpacer} />;
              if (k === 'del') {
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.key}
                    onPress={() => press('del')}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="backspace-outline" size={26} color={THEME.colors.text} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.key}
                  onPress={() => press(k)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{k}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.colors.border,
    marginBottom: 18,
  },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
    paddingHorizontal: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: THEME.colors.primary,
  },
  dotError: {
    borderColor: THEME.colors.error,
  },
  errorSlot: {
    height: 28,
    justifyContent: 'center',
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    justifyContent: 'space-between',
    rowGap: 12,
  },
  key: {
    width: 88,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.card,
    ...THEME.shadow.small,
  },
  keySpacer: {
    width: 88,
    height: 64,
  },
  keyText: {
    fontSize: 26,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  cancelBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  cancelText: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.textSecondary,
  },
});
