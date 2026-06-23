import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

type DialogVariant = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogOptions {
  title: string;
  message?: string;
  variant?: DialogVariant;
  buttons?: DialogButton[];
}

interface DialogContextValue {
  /** Show a custom popup card. Returns nothing; use button onPress callbacks. */
  alert: (options: DialogOptions) => void;
}

const DialogContext = createContext<DialogContextValue>({ alert: () => {} });

export const useDialog = () => useContext(DialogContext);

const VARIANT_MAP: Record<
  DialogVariant,
  { icon: keyof typeof Ionicons.glyphMap; color: string; surface: string }
> = {
  success: { icon: 'checkmark-circle', color: THEME.colors.success, surface: THEME.colors.successSurface },
  error: { icon: 'close-circle', color: THEME.colors.error, surface: THEME.colors.errorSurface },
  warning: { icon: 'warning', color: THEME.colors.warning, surface: THEME.colors.warningSurface },
  info: { icon: 'information-circle', color: THEME.colors.primary, surface: THEME.colors.primarySurface },
  confirm: { icon: 'help-circle', color: THEME.colors.primary, surface: THEME.colors.primarySurface },
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    scale.setValue(0.9);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.92, duration: 130, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setOptions(null);
    });
  }, [opacity, scale]);

  const alert = useCallback((opts: DialogOptions) => {
    setOptions(opts);
    setVisible(true);
    requestAnimationFrame(animateIn);
  }, [animateIn]);

  function handlePress(btn: DialogButton) {
    close();
    // Defer the callback until after the close animation begins
    setTimeout(() => btn.onPress?.(), 0);
  }

  const variant = options?.variant ?? 'info';
  const v = VARIANT_MAP[variant];
  const buttons: DialogButton[] = options?.buttons ?? [{ text: 'OK', style: 'default' }];

  return (
    <DialogContext.Provider value={{ alert }}>
      {children}

      <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
            {options && (
              <>
                <View style={[styles.iconBadge, { backgroundColor: v.surface }]}>
                  <Ionicons name={v.icon} size={34} color={v.color} />
                </View>

                <Text style={styles.title}>{options.title}</Text>
                {!!options.message && <Text style={styles.message}>{options.message}</Text>}

                <View style={[styles.buttonRow, buttons.length > 2 && styles.buttonColumn]}>
                  {buttons.map((btn, idx) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    return (
                      <TouchableOpacity
                        key={`${btn.text}-${idx}`}
                        style={[
                          styles.button,
                          isCancel && styles.buttonCancel,
                          isDestructive && styles.buttonDestructive,
                          !isCancel && !isDestructive && styles.buttonDefault,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => handlePress(btn)}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            isCancel && styles.buttonCancelText,
                            isDestructive && styles.buttonDestructiveText,
                            !isCancel && !isDestructive && styles.buttonDefaultText,
                          ]}
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    ...THEME.shadow.large,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  buttonColumn: {
    flexDirection: 'column-reverse',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: THEME.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonDefault: {
    backgroundColor: THEME.colors.primary,
  },
  buttonCancel: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  buttonDestructive: {
    backgroundColor: THEME.colors.error,
  },
  buttonText: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.bold,
  },
  buttonDefaultText: { color: '#FFFFFF' },
  buttonCancelText: { color: THEME.colors.textSecondary },
  buttonDestructiveText: { color: '#FFFFFF' },
});
