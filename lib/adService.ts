import { supabase } from './supabase';

// ─── Award points to a user after watching an ad ────────────────────────────

export async function awardPoints(
  userId: string,
  adTypeId: string,
  pointsEarned: number,
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  try {
    // Insert transaction record
    const { error: txError } = await supabase.from('points_transactions').insert({
      user_id: userId,
      ad_type_id: adTypeId,
      points_earned: pointsEarned,
    });

    if (txError) throw txError;

    // Increment points in profile using RPC or manual update
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newTotal = (profile?.points ?? 0) + pointsEarned;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newTotal })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true, newTotal };
  } catch (err: any) {
    return { success: false, newTotal: 0, error: err.message };
  }
}

// ─── Deduct points for a redemption ─────────────────────────────────────────

export async function deductPoints(
  userId: string,
  pointsToDeduct: number,
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const current = profile?.points ?? 0;
    if (current < pointsToDeduct) {
      return { success: false, newTotal: current, error: 'Insufficient points' };
    }

    const newTotal = current - pointsToDeduct;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newTotal })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true, newTotal };
  } catch (err: any) {
    return { success: false, newTotal: 0, error: err.message };
  }
}

// ─── Fetch ad types from Supabase ───────────────────────────────────────────

export async function fetchAdTypes() {
  const { data, error } = await supabase
    .from('ad_types')
    .select('*')
    .order('points_reward', { ascending: false });

  return { data, error };
}

// ─── Fetch user's points transactions ───────────────────────────────────────

export async function fetchPointsHistory(userId: string) {
  const { data, error } = await supabase
    .from('points_transactions')
    .select('*, ad_types(name, points_reward)')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false });

  return { data, error };
}
