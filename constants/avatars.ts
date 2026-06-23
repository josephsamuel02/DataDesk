import { Ionicons } from '@expo/vector-icons';

export type IoniconName = keyof typeof Ionicons.glyphMap;

export interface AvatarPreset {
  id: string;
  icon: IoniconName;
  bg: string;
}

// Preset avatars rendered from icons on a colored circle — no image upload needed.
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'happy', icon: 'happy', bg: '#F59E0B' },
  { id: 'rocket', icon: 'rocket', bg: '#8B5CF6' },
  { id: 'planet', icon: 'planet', bg: '#3B82F6' },
  { id: 'paw', icon: 'paw', bg: '#F97316' },
  { id: 'football', icon: 'football', bg: '#22C55E' },
  { id: 'musical-notes', icon: 'musical-notes', bg: '#EC4899' },
  { id: 'flash', icon: 'flash', bg: '#EAB308' },
  { id: 'heart', icon: 'heart', bg: '#EF4444' },
  { id: 'game-controller', icon: 'game-controller', bg: '#6366F1' },
  { id: 'leaf', icon: 'leaf', bg: '#10B981' },
  { id: 'star', icon: 'star', bg: '#F5C518' },
  { id: 'paper-plane', icon: 'paper-plane', bg: '#06B6D4' },
];

export const AVATAR_PRESET_PREFIX = 'preset:';

export function getPreset(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.id === id);
}

/** Parse a stored avatar_url value into a preset (if it uses the preset scheme). */
export function parsePreset(value?: string | null): AvatarPreset | undefined {
  if (!value || !value.startsWith(AVATAR_PRESET_PREFIX)) return undefined;
  return getPreset(value.slice(AVATAR_PRESET_PREFIX.length));
}
