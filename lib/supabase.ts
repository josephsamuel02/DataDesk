import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Types matching DB schema ────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string | null;
  phone_number: string | null;
  email: string | null;
  avatar_url: string | null;
  /** ISO country code detected at registration (e.g. "NG"), or null/"OTHER" if unsupported. */
  country: string | null;
  /** This user's own referral code to share. */
  referral_code: string | null;
  /** The profile id of whoever referred this user, if any. */
  referred_by: string | null;
  /** Last date (YYYY-MM-DD) the daily login bonus was claimed. */
  last_daily_bonus_at: string | null;
  points: number;
  created_at: string;

  // ── Tier / streak system ──────────────────────────────────────────────────
  /** Reward tier: 1 = Starter, 2 = Active, 3 = Loyal. Never downgrades. */
  tier: number;
  /** Total rewarded ads watched over the account's lifetime. */
  lifetime_ads: number;
  /** Consecutive Nigeria-days with at least one ad watched. */
  current_streak: number;
  /** Best streak ever reached. */
  longest_streak: number;
  /** Timestamp of the most recently watched rewarded ad. */
  last_ad_watched_at: string | null;
  /** Ads watched on the current Nigeria day (resets at local midnight). */
  ads_watched_today: number;
  /** The Nigeria date (YYYY-MM-DD) the daily counter was last reset/used. */
  daily_reset_date: string | null;
}

export interface AdTypeRow {
  id: string;
  name: string;
  points_reward: number;
  duration_seconds: number | null;
  description: string | null;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  ad_type_id: string | null;
  points_earned: number;
  source: 'ad' | 'daily_bonus' | 'referral' | null;
  watched_at: string;
  ad_types?: AdTypeRow;
}

export interface RechargeRequest {
  id: string;
  user_id: string;
  phone_number: string;
  network: string;
  data_plan: string;
  points_spent: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
}

export interface DataPurchase {
  id: string;
  user_id: string;
  phone_number: string;
  network: string;
  data_plan: string;
  amount_paid: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}
