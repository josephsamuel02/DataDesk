import { supabase, Profile } from './supabase';

// Returns the current user's profile, creating the row if it doesn't exist yet.
// This self-heals accounts whose profile row was never created (e.g. signups
// during email confirmation, where the insert ran before a session existed and
// was blocked by RLS), and works because the user is authenticated when called.
export async function ensureProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing as Profile;

  const meta = (user.user_metadata ?? {}) as { username?: string | null };
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email ?? null,
      username: meta.username ?? null,
      points: 0,
    })
    .select()
    .single();

  if (insertError) {
    console.warn('ensureProfile: could not create profile:', insertError.message);
    return null;
  }
  return created as Profile;
}
