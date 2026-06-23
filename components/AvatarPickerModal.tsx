import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { AVATAR_PRESETS } from '../constants/avatars';

interface AvatarPickerModalProps {
  visible: boolean;
  selectedValue?: string | null;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
  onUpload: () => void;
}

export function AvatarPickerModal({
  visible,
  selectedValue,
  onClose,
  onSelectPreset,
  onUpload,
}: AvatarPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Choose your avatar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
            {AVATAR_PRESETS.map((preset) => {
              const isSelected = selectedValue === `preset:${preset.id}`;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={styles.presetWrap}
                  activeOpacity={0.8}
                  onPress={() => onSelectPreset(preset.id)}
                >
                  <View
                    style={[
                      styles.preset,
                      { backgroundColor: preset.bg },
                      isSelected && styles.presetSelected,
                    ]}
                  >
                    <Ionicons name={preset.icon} size={30} color="#FFFFFF" />
                  </View>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.85} onPress={onUpload}>
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>Upload your own photo</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
    paddingBottom: 8,
  },
  presetWrap: {
    width: '21%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  preset: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  presetSelected: {
    borderColor: THEME.colors.primary,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.background,
  },
  uploadBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.button,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    ...THEME.shadow.medium,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
  },
});
