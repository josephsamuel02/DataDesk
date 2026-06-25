-- ─────────────────────────────────────────────────────────────────────────────
-- Data Desk — 3-tier daily ad limit system
-- Tiers:  1 Starter (35/day) · 2 Active (45/day) · 3 Loyal (54/day)
-- Unlocks: Active  = streak >= 7  OR lifetime_ads >= 200
--          Loyal   = streak >= 21 OR lifetime_ads >= 600
-- Tiers never downgrade. Days are Nigeria calendar days (Africa/Lagos, UTC+1).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New profile columns (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier               INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_ads       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_ad_watched_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ads_watched_today  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_reset_date   DATE;

-- 2. Tier daily limit helper
CREATE OR REPLACE FUNCTION public.tier_daily_limit(t INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN t >= 3 THEN 54
    WHEN t = 2 THEN 45
    ELSE 35
  END;
$$;

-- 3. Tier evaluation (mirrors lib/tierService.ts evaluateTier; never downgrades)
CREATE OR REPLACE FUNCTION public.evaluate_tier(cur_tier INTEGER, streak INTEGER, lifetime INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  qualified INTEGER := 1;
BEGIN
  IF streak >= 7 OR lifetime >= 200 THEN qualified := 2; END IF;
  IF streak >= 21 OR lifetime >= 600 THEN qualified := 3; END IF;
  RETURN greatest(coalesce(cur_tier, 1), qualified);
END;
$$;

-- 4. Atomic "record a watched ad" — server-enforced cooldown + daily limit,
--    streak/lifetime/tier maintenance, and points award, in one transaction.
CREATE OR REPLACE FUNCTION public.record_ad_watched()
RETURNS TABLE (
  success BOOLEAN,
  reason TEXT,                 -- 'ok' | 'cooldown' | 'daily_limit' | 'no_auth'
  awarded_points INTEGER,
  points INTEGER,              -- new balance
  tier INTEGER,
  ads_watched_today INTEGER,
  lifetime_ads INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  last_ad_watched_at TIMESTAMPTZ,
  daily_reset_date DATE,
  cooldown_remaining INTEGER,
  tier_changed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid        UUID := auth.uid();
  app_tz     TEXT := 'Africa/Lagos';
  now_ts     TIMESTAMPTZ := now();
  cooldown   INTEGER := 180;
  reward     INTEGER := 2;
  ad_uuid    UUID;
  today      DATE := (timezone(app_tz, now_ts))::date;
  prof       RECORD;
  eff_today  INTEGER;          -- ads_watched_today after applying daily reset
  last_day   DATE;
  new_streak INTEGER;
  new_tier   INTEGER;
  cur_limit  INTEGER;
  cd_left    INTEGER := 0;
BEGIN
  IF uid IS NULL THEN
    success := false; reason := 'no_auth'; awarded_points := 0; points := 0;
    tier := 1; ads_watched_today := 0; lifetime_ads := 0; current_streak := 0;
    longest_streak := 0; last_ad_watched_at := NULL; daily_reset_date := today;
    cooldown_remaining := 0; tier_changed := false;
    RETURN NEXT; RETURN;
  END IF;

  SELECT p.* INTO prof FROM public.profiles p WHERE p.id = uid FOR UPDATE;

  -- Daily reset if we've rolled into a new Nigeria day.
  IF prof.daily_reset_date IS NULL OR prof.daily_reset_date < today THEN
    eff_today := 0;
  ELSE
    eff_today := coalesce(prof.ads_watched_today, 0);
  END IF;

  -- Cooldown gate (3 minutes between ads).
  IF prof.last_ad_watched_at IS NOT NULL THEN
    cd_left := greatest(0, cooldown - floor(extract(epoch from (now_ts - prof.last_ad_watched_at)))::int);
  END IF;
  IF cd_left > 0 THEN
    success := false; reason := 'cooldown'; awarded_points := 0; points := prof.points;
    tier := prof.tier; ads_watched_today := eff_today; lifetime_ads := prof.lifetime_ads;
    current_streak := prof.current_streak; longest_streak := prof.longest_streak;
    last_ad_watched_at := prof.last_ad_watched_at; daily_reset_date := today;
    cooldown_remaining := cd_left; tier_changed := false;
    RETURN NEXT; RETURN;
  END IF;

  -- Daily limit gate (based on the user's current tier).
  cur_limit := public.tier_daily_limit(prof.tier);
  IF eff_today >= cur_limit THEN
    success := false; reason := 'daily_limit'; awarded_points := 0; points := prof.points;
    tier := prof.tier; ads_watched_today := eff_today; lifetime_ads := prof.lifetime_ads;
    current_streak := prof.current_streak; longest_streak := prof.longest_streak;
    last_ad_watched_at := prof.last_ad_watched_at; daily_reset_date := today;
    cooldown_remaining := 0; tier_changed := false;
    -- Persist the reset so the counter is correct for the rest of the day.
    UPDATE public.profiles AS p
      SET ads_watched_today = eff_today, daily_reset_date = today
      WHERE p.id = uid;
    RETURN NEXT; RETURN;
  END IF;

  -- Streak: consecutive Nigeria-days with at least one ad watched.
  last_day := (timezone(app_tz, prof.last_ad_watched_at))::date;
  IF last_day = today THEN
    new_streak := greatest(prof.current_streak, 1);   -- already counted today
  ELSIF last_day = today - 1 THEN
    new_streak := coalesce(prof.current_streak, 0) + 1;
  ELSE
    new_streak := 1;                                   -- first ever, or a gap
  END IF;

  new_tier := public.evaluate_tier(prof.tier, new_streak, prof.lifetime_ads + 1);

  SELECT id INTO ad_uuid FROM public.ad_types WHERE name = 'Rewarded Video Ad' LIMIT 1;

  UPDATE public.profiles AS p SET
    ads_watched_today  = eff_today + 1,
    lifetime_ads       = p.lifetime_ads + 1,
    last_ad_watched_at = now_ts,
    current_streak     = new_streak,
    longest_streak     = greatest(p.longest_streak, new_streak),
    tier               = new_tier,
    daily_reset_date   = today,
    points             = p.points + reward
  WHERE p.id = uid
  RETURNING p.points, p.ads_watched_today, p.lifetime_ads, p.current_streak, p.longest_streak
  INTO points, ads_watched_today, lifetime_ads, current_streak, longest_streak;

  INSERT INTO public.points_transactions (user_id, ad_type_id, points_earned, source, watched_at)
  VALUES (uid, ad_uuid, reward, 'ad', now_ts);

  success := true; reason := 'ok'; awarded_points := reward;
  tier := new_tier; last_ad_watched_at := now_ts; daily_reset_date := today;
  cooldown_remaining := cooldown; tier_changed := (new_tier <> prof.tier);
  RETURN NEXT; RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_ad_watched() TO authenticated;
