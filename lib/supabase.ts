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
  points: number;
  created_at: string;
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
  ad_type_id: string;
  points_earned: number;
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
