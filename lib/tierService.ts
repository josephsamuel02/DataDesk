import { supabase, Profile } from './supabase';
import { THEME } from '../constants/theme';
import { getNigeriaDateString } from './time';

// ─── 3-tier daily ad limit system ───────────────────────────────────────────
// Client-side evaluation for instant UI; the authoritative writes happen in the
// `record_ad_watched` Postgres function (see supabase/migrations/0001_tier_system.sql).

export type UserProfile = Profile;

export const AD_COOLDOWN_SECONDS = 180;

export interface TierConfig {
  name: string;
  dailyLimit: number;
  color: string;
  icon: string;
}

const TIER_CONFIG: Record<number, TierConfig> = {
  1: { name: 'Starter', dailyLimit: 35, color: '#8A8AA3', icon: '🥉' },
  2: { name: 'Active', dailyLimit: 45, color: THEME.colors.primary, icon: '🥈' },
  3: { name: 'Loyal', dailyLimit: 54, color: THEME.colors.accent, icon: '🥇' },
};

export function getTierConfig(tier: number): TierConfig {
  return TIER_CONFIG[tier] ?? TIER_CONFIG[1];
}

/** Thresholds to *reach* a given tier (used by the progress card). */
export const TIER_UNLOCKS: Record<number, { streak: number; lifetime: number }> = {
  2: { streak: 7, lifetime: 200 },
  3: { streak: 21, lifetime: 600 },
};

/** Returns the correct tier; never lower than the current tier (no downgrades). */
export function evaluateTier(currentTier: number, currentStreak: number, lifetimeAds: number): number {
  let qualified = 1;
  if (currentStreak >= TIER_UNLOCKS[2].streak || lifetimeAds >= TIER_UNLOCKS[2].lifetime) qualified = 2;
  if (currentStreak >= TIER_UNLOCKS[3].streak || lifetimeAds >= TIER_UNLOCKS[3].lifetime) qualified = 3;
  return Math.max(currentTier || 1, qualified);
}

/**
 * If the profile's daily counter belongs to an earlier Nigeria day, returns the
 * fields that reset it. Merge the result into the profile before any ad logic.
 */
export function checkAndResetDaily(profile: UserProfile): Partial<UserProfile> {
  const today = getNigeriaDateString();
  if (!profile.daily_reset_date || profile.daily_reset_date < today) {
    return { ads_watched_today: 0, daily_reset_date: today };
  }
  return {};
}

export type WatchBlockReason = 'daily_limit_reached' | 'cooldown_active';

export function canWatchAd(profile: UserProfile): { allowed: boolean; reason?: WatchBlockReason } {
  const limit = getTierConfig(profile.tier).dailyLimit;
  const today = getNigeriaDateString();
  // Effective count, accounting for an un-flushed daily reset.
  const watchedToday =
    !profile.daily_reset_date || profile.daily_reset_date < today ? 0 : profile.ads_watched_today ?? 0;

  if (profile.last_ad_watched_at) {
    const elapsed = (Date.now() - new Date(profile.last_ad_watched_at).getTime()) / 1000;
    if (elapsed < AD_COOLDOWN_SECONDS) return { allowed: false, reason: 'cooldown_active' };
  }
  if (watchedToday >= limit) return { allowed: false, reason: 'daily_limit_reached' };
  return { allowed: true };
}

export interface RecordAdResult {
  success: boolean;
  reason: 'ok' | 'cooldown' | 'daily_limit' | 'no_auth' | 'error';
  awardedPoints: number;
  points: number;
  tier: number;
  adsWatchedToday: number;
  lifetimeAds: number;
  currentStreak: number;
  longestStreak: number;
  lastAdWatchedAt: string | null;
  dailyResetDate: string | null;
  cooldownRemaining: number;
  tierChanged: boolean;
  error?: string;
}

/**
 * Records a *confirmed* rewarded-ad view. The server re-checks the cooldown and
 * tier daily limit, maintains streak/lifetime/tier, and awards points atomically.
 */
export async function recordAdWatched(): Promise<RecordAdResult> {
  const { data, error } = await supabase.rpc('record_ad_watched');
  if (error) {
    return {
      success: false,
      reason: 'error',
      awardedPoints: 0,
      points: 0,
      tier: 1,
      adsWatchedToday: 0,
      lifetimeAds: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastAdWatchedAt: null,
      dailyResetDate: null,
      cooldownRemaining: 0,
      tierChanged: false,
      error: error.message,
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    success: !!row?.success,
    reason: (row?.reason as RecordAdResult['reason']) ?? 'error',
    awardedPoints: row?.awarded_points ?? 0,
    points: row?.points ?? 0,
    tier: row?.tier ?? 1,
    adsWatchedToday: row?.ads_watched_today ?? 0,
    lifetimeAds: row?.lifetime_ads ?? 0,
    currentStreak: row?.current_streak ?? 0,
    longestStreak: row?.longest_streak ?? 0,
    lastAdWatchedAt: row?.last_ad_watched_at ?? null,
    dailyResetDate: row?.daily_reset_date ?? null,
    cooldownRemaining: row?.cooldown_remaining ?? 0,
    tierChanged: !!row?.tier_changed,
  };
}

/** Persists a client-side daily reset and/or tier upgrade to Supabase. */
export async function persistProfilePatch(userId: string, patch: Partial<UserProfile>): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await supabase.from('profiles').update(patch).eq('id', userId);
}
