import { supabase } from './supabase';

// ─── Daily login bonus ──────────────────────────────────────────────────────
// Calls the SECURITY DEFINER `claim_daily_bonus` RPC, which awards 5 points at
// most once per calendar day and records a points_transactions row.

export interface DailyBonusResult {
  success: boolean;
  alreadyClaimed: boolean;
  newTotal?: number;
  awarded?: number;
  error?: string;
}

export async function claimDailyBonus(): Promise<DailyBonusResult> {
  const { data, error } = await supabase.rpc('claim_daily_bonus');
  if (error) {
    return { success: false, alreadyClaimed: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { success: false, alreadyClaimed: false, error: 'No response from server' };
  }

  if (!row.claimed) {
    return { success: true, alreadyClaimed: true, newTotal: row.points };
  }

  return {
    success: true,
    alreadyClaimed: false,
    newTotal: row.points,
    awarded: row.awarded,
  };
}

/** True if the daily bonus has already been claimed today. */
export function isDailyBonusClaimed(lastClaimDate: string | null): boolean {
  if (!lastClaimDate) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
  // last_daily_bonus_at comes back as 'YYYY-MM-DD'.
  return lastClaimDate.slice(0, 10) === todayStr;
}
