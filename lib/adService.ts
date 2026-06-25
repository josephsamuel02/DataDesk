import { supabase } from './supabase';

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
