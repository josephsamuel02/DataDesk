import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface LegalHeaderProps {
  title: string;
}

/** Sticky navy header with a back arrow, shared by the legal screens. */
export function LegalHeader({ title }: LegalHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="light" />
      <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 14,
    backgroundColor: THEME.colors.primary,
    ...THEME.shadow.medium,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: '#FFFFFF',
  },
});
