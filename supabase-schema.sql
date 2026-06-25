-- Data Desk — Supabase Database Schema
-- Run these migrations in Supabase Studio (SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Profiles table (extends Supabase auth.users)
-- phone_number is optional at sign-up (email auth) but required before redeeming data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  phone_number TEXT UNIQUE,          -- nullable: added later in Profile screen
  email TEXT,
  avatar_url TEXT,
  country TEXT,                       -- ISO code detected at registration (e.g. 'NG'); 'OTHER'/NULL = unsupported
  referral_code TEXT UNIQUE,         -- this user's own code to share
  referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_daily_bonus_at DATE,          -- last date the daily login bonus was claimed
  points INTEGER DEFAULT 0 NOT NULL,
  -- Tier / streak system (see supabase/migrations/0001_tier_system.sql)
  tier INTEGER NOT NULL DEFAULT 1,           -- 1 Starter, 2 Active, 3 Loyal
  lifetime_ads INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_ad_watched_at TIMESTAMPTZ,
  ads_watched_today INTEGER NOT NULL DEFAULT 0,
  daily_reset_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for existing databases: add columns if the table predates them.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_bonus_at DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_ads INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_ad_watched_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ads_watched_today INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_reset_date DATE;

-- Backfill referral codes for users created before this column existed.
UPDATE profiles
  SET referral_code = upper(substr(md5(id::text), 1, 8))
  WHERE referral_code IS NULL;

-- ─── Auth Settings ──────────────────────────────────────────────────────────
-- Authentication → Providers → Email: ENABLE
-- Authentication → Providers → Phone: can be disabled for now
-- Enable "Confirm email" in Auth → Settings if you want email verification
-- (If disabled, users are logged in immediately after signUp)

-- 2. Ad types
-- name is UNIQUE so the app can resolve the row by name and re-seeding is idempotent
CREATE TABLE IF NOT EXISTS ad_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  points_reward INTEGER NOT NULL,
  duration_seconds INTEGER,
  description TEXT
);

-- 3. Seed default ad types ('Rewarded Video Ad' is looked up by record_ad_watched())
INSERT INTO ad_types (name, points_reward, duration_seconds, description) VALUES
  ('Rewarded Video Ad', 2, 30, 'Watch a short video to earn points')
ON CONFLICT (name) DO UPDATE SET
  points_reward = EXCLUDED.points_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  description = EXCLUDED.description;

-- 4. Points transactions
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ad_type_id UUID REFERENCES ad_types(id),
  points_earned INTEGER NOT NULL,
  source TEXT DEFAULT 'ad',          -- 'ad' | 'daily_bonus' | 'referral'
  watched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing databases.
ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ad';

-- 5. Recharge requests (points-based)
CREATE TABLE IF NOT EXISTS recharge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  network TEXT NOT NULL,
  data_plan TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 6. Direct data purchases (cash-based)
CREATE TABLE IF NOT EXISTS data_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  network TEXT NOT NULL,
  data_plan TEXT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_purchases ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── Auto-create a profile row for every new auth user ──────────────────────
-- This runs with SECURITY DEFINER so it bypasses RLS, guaranteeing a profile
-- exists even when email confirmation is on (no client session at signup time).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code  TEXT := NULLIF(NEW.raw_user_meta_data ->> 'referral_code', '');
  my_code   TEXT := upper(substr(md5(NEW.id::text), 1, 8));
  referrer  UUID;
BEGIN
  -- Resolve the referrer (if a valid code was supplied at sign-up).
  IF ref_code IS NOT NULL THEN
    SELECT id INTO referrer FROM public.profiles WHERE referral_code = upper(ref_code) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, username, phone_number, country, referral_code, referred_by, points)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone_number', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'country', ''),
    my_code,
    referrer,
    0
  )
  ON CONFLICT (id) DO NOTHING;

  -- Reward the referrer with 50 points for the signup.
  IF referrer IS NOT NULL AND referrer <> NEW.id THEN
    UPDATE public.profiles SET points = points + 50 WHERE id = referrer;
    INSERT INTO public.points_transactions (user_id, points_earned, source)
    VALUES (referrer, 50, 'referral');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Daily login bonus (once per calendar day, +5 points) ───────────────────
-- SECURITY DEFINER so it can write points_transactions / profiles atomically.
CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS TABLE (claimed BOOLEAN, points INTEGER, awarded INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid       UUID := auth.uid();
  last_date DATE;
  bonus     INTEGER := 5;
  new_total INTEGER;
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  SELECT last_daily_bonus_at, p.points INTO last_date, new_total
  FROM public.profiles p WHERE p.id = uid FOR UPDATE;

  IF last_date = CURRENT_DATE THEN
    RETURN QUERY SELECT false, new_total, 0;
    RETURN;
  END IF;

  UPDATE public.profiles AS p
    SET points = p.points + bonus, last_daily_bonus_at = CURRENT_DATE
    WHERE p.id = uid
    RETURNING p.points INTO new_total;

  INSERT INTO public.points_transactions (user_id, points_earned, source)
  VALUES (uid, bonus, 'daily_bonus');

  RETURN QUERY SELECT true, new_total, bonus;
END;
$$;

-- Points transactions
CREATE POLICY "Users can view own points"
  ON points_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points"
  ON points_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recharge requests
CREATE POLICY "Users can view own recharges"
  ON recharge_requests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert recharges"
  ON recharge_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recharges"
  ON recharge_requests FOR UPDATE USING (auth.uid() = user_id);

-- Data purchases
CREATE POLICY "Users can view own purchases"
  ON data_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert purchases"
  ON data_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Storage Bucket for Avatars ─────────────────────────────────────────────
-- Run this whole block in the SQL Editor. Files are stored at "<uid>/avatar.ext",
-- so each user may only write inside their own folder. The bucket is public-read.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;

CREATE POLICY "Avatar public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── Rewarded-ad guardrails: cooldown + session distribution ────────────────
-- Engagement-quality controls enforced SERVER-SIDE (clients are not trusted):
--   • 180s cooldown between ad rewards
--   • Daily cap of 30 rewarded ads
--   • Day split into 2 sessions (local app time): Day 06:00–15:00, Night
--     15:00–06:00 (+1d). Each session allows up to 70% of the daily cap (= 21).
--     Together the two sessions cover the full 24h — ads are never "closed".
-- Adjust the constants inside the functions below to retune. Session windows use
-- a single reference timezone (Africa/Lagos); change app_tz to retune.

-- Resolve the ad session (and its window bounds) for a given instant.
CREATE OR REPLACE FUNCTION public.ad_session_at(ts TIMESTAMPTZ)
RETURNS TABLE (session_key TEXT, win_start TIMESTAMPTZ, win_end TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  app_tz   TEXT := 'Africa/Lagos';
  local_ts TIMESTAMP := timezone(app_tz, ts);
  d        DATE := local_ts::date;
  h        INTEGER := extract(hour from local_ts)::int;
BEGIN
  IF h >= 6 AND h < 15 THEN
    -- Day session (06:00–15:00)
    session_key := 'day';
    win_start := timezone(app_tz, (d + time '06:00'));
    win_end   := timezone(app_tz, (d + time '15:00'));
  ELSIF h >= 15 THEN
    -- Night session that begins today (15:00) and ends tomorrow 06:00
    session_key := 'night';
    win_start := timezone(app_tz, (d + time '15:00'));
    win_end   := timezone(app_tz, ((d + 1) + time '06:00'));
  ELSE
    -- Early morning (h < 6): night session began yesterday 15:00, ends today 06:00
    session_key := 'night';
    win_start := timezone(app_tz, ((d - 1) + time '15:00'));
    win_end   := timezone(app_tz, (d + time '06:00'));
  END IF;
  RETURN NEXT;
  RETURN;
END;
$$;

-- Read-only ad availability snapshot for the current user.
CREATE OR REPLACE FUNCTION public.get_ad_status()
RETURNS TABLE (
  session_open BOOLEAN,
  session_key TEXT,
  cooldown_remaining INTEGER,
  session_count INTEGER,
  session_cap INTEGER,
  daily_count INTEGER,
  daily_cap INTEGER,
  seconds_to_next_window INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid       UUID := auth.uid();
  app_tz    TEXT := 'Africa/Lagos';
  now_ts    TIMESTAMPTZ := now();
  cooldown  INTEGER := 180;
  sess      RECORD;
  day_start TIMESTAMPTZ;
  last_ad   TIMESTAMPTZ;
BEGIN
  daily_cap := 30;
  session_cap := ceil(daily_cap * 0.7)::int;

  IF uid IS NULL THEN
    session_open := false; session_key := NULL; cooldown_remaining := 0;
    session_count := 0; daily_count := 0; seconds_to_next_window := 0;
    RETURN NEXT; RETURN;
  END IF;

  SELECT s.session_key, s.win_start, s.win_end INTO sess
  FROM public.ad_session_at(now_ts) s;

  day_start := timezone(app_tz, (timezone(app_tz, now_ts)::date + time '00:00'));

  SELECT count(*) INTO daily_count FROM public.points_transactions
    WHERE user_id = uid AND source = 'ad' AND watched_at >= day_start;

  SELECT max(watched_at) INTO last_ad FROM public.points_transactions
    WHERE user_id = uid AND source = 'ad';

  IF last_ad IS NOT NULL THEN
    cooldown_remaining := greatest(0, cooldown - floor(extract(epoch from (now_ts - last_ad)))::int);
  ELSE
    cooldown_remaining := 0;
  END IF;

  -- Two sessions cover the whole day, so ads are always within a session.
  session_open := true;
  session_key := sess.session_key;
  SELECT count(*) INTO session_count FROM public.points_transactions
    WHERE user_id = uid AND source = 'ad'
      AND watched_at >= sess.win_start AND watched_at < sess.win_end;
  seconds_to_next_window := 0;

  RETURN NEXT; RETURN;
END;
$$;

-- Atomically award one rewarded-ad credit if all guardrails pass.
CREATE OR REPLACE FUNCTION public.claim_ad_reward()
RETURNS TABLE (
  awarded BOOLEAN,
  reason TEXT,
  points INTEGER,
  awarded_points INTEGER,
  cooldown_remaining INTEGER,
  session_count INTEGER,
  session_cap INTEGER,
  daily_count INTEGER,
  daily_cap INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid       UUID := auth.uid();
  app_tz    TEXT := 'Africa/Lagos';
  now_ts    TIMESTAMPTZ := now();
  cooldown  INTEGER := 180;
  reward    INTEGER := 2;
  ad_uuid   UUID;
  sess      RECORD;
  day_start TIMESTAMPTZ;
  last_ad   TIMESTAMPTZ;
  new_total INTEGER;
  d_count   INTEGER;
  s_count   INTEGER;
  cd_left   INTEGER := 0;
BEGIN
  daily_cap := 30;
  session_cap := ceil(daily_cap * 0.7)::int;

  IF uid IS NULL THEN
    awarded := false; reason := 'no_auth'; points := 0; awarded_points := 0;
    cooldown_remaining := 0; session_count := 0; daily_count := 0;
    RETURN NEXT; RETURN;
  END IF;

  -- Serialize concurrent claims for this user.
  SELECT p.points INTO new_total FROM public.profiles p WHERE p.id = uid FOR UPDATE;

  SELECT s.session_key, s.win_start, s.win_end INTO sess
  FROM public.ad_session_at(now_ts) s;

  day_start := timezone(app_tz, (timezone(app_tz, now_ts)::date + time '00:00'));

  SELECT max(watched_at) INTO last_ad FROM public.points_transactions
    WHERE user_id = uid AND source = 'ad';
  IF last_ad IS NOT NULL THEN
    cd_left := greatest(0, cooldown - floor(extract(epoch from (now_ts - last_ad)))::int);
  END IF;

  SELECT count(*) INTO d_count FROM public.points_transactions
    WHERE user_id = uid AND source = 'ad' AND watched_at >= day_start;

  SELECT count(*) INTO s_count FROM public.points_transactions
    WHERE user_id = uid AND source = 'ad'
      AND watched_at >= sess.win_start AND watched_at < sess.win_end;

  IF cd_left > 0 THEN
    awarded := false; reason := 'cooldown'; points := new_total; awarded_points := 0;
    cooldown_remaining := cd_left; session_count := s_count; daily_count := d_count;
    RETURN NEXT; RETURN;
  END IF;

  IF d_count >= daily_cap THEN
    awarded := false; reason := 'daily_cap'; points := new_total; awarded_points := 0;
    cooldown_remaining := 0; session_count := s_count; daily_count := d_count;
    RETURN NEXT; RETURN;
  END IF;

  IF s_count >= session_cap THEN
    awarded := false; reason := 'session_cap'; points := new_total; awarded_points := 0;
    cooldown_remaining := 0; session_count := s_count; daily_count := d_count;
    RETURN NEXT; RETURN;
  END IF;

  -- Passed all checks → award.
  SELECT id INTO ad_uuid FROM public.ad_types WHERE name = 'Rewarded Video Ad' LIMIT 1;

  INSERT INTO public.points_transactions (user_id, ad_type_id, points_earned, source, watched_at)
  VALUES (uid, ad_uuid, reward, 'ad', now_ts);

  -- Alias the table so `points` is unambiguous against the OUT parameter.
  UPDATE public.profiles AS p SET points = p.points + reward WHERE p.id = uid
    RETURNING p.points INTO new_total;

  awarded := true; reason := 'ok'; points := new_total; awarded_points := reward;
  cooldown_remaining := cooldown; session_count := s_count + 1; daily_count := d_count + 1;
  RETURN NEXT; RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ad_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ad_reward() TO authenticated;

-- ─── 3-tier daily ad limit system ───────────────────────────────────────────
-- See supabase/migrations/0001_tier_system.sql for the full description.
-- record_ad_watched() supersedes claim_ad_reward() as the ad-award entry point:
-- it enforces the 3-min cooldown + tier-based daily limit, maintains streaks /
-- lifetime / tier, and awards points — all atomically. Tiers never downgrade.

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

CREATE OR REPLACE FUNCTION public.record_ad_watched()
RETURNS TABLE (
  success BOOLEAN,
  reason TEXT,
  awarded_points INTEGER,
  points INTEGER,
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
  eff_today  INTEGER;
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

  IF prof.daily_reset_date IS NULL OR prof.daily_reset_date < today THEN
    eff_today := 0;
  ELSE
    eff_today := coalesce(prof.ads_watched_today, 0);
  END IF;

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

  cur_limit := public.tier_daily_limit(prof.tier);
  IF eff_today >= cur_limit THEN
    success := false; reason := 'daily_limit'; awarded_points := 0; points := prof.points;
    tier := prof.tier; ads_watched_today := eff_today; lifetime_ads := prof.lifetime_ads;
    current_streak := prof.current_streak; longest_streak := prof.longest_streak;
    last_ad_watched_at := prof.last_ad_watched_at; daily_reset_date := today;
    cooldown_remaining := 0; tier_changed := false;
    UPDATE public.profiles AS p
      SET ads_watched_today = eff_today, daily_reset_date = today
      WHERE p.id = uid;
    RETURN NEXT; RETURN;
  END IF;

  last_day := (timezone(app_tz, prof.last_ad_watched_at))::date;
  IF last_day = today THEN
    new_streak := greatest(prof.current_streak, 1);
  ELSIF last_day = today - 1 THEN
    new_streak := coalesce(prof.current_streak, 0) + 1;
  ELSE
    new_streak := 1;
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

-- ─── 28-hour retention for points-earned records ────────────────────────────
-- History cleanup only — does NOT touch the spendable balance (profiles.points).
-- Requires pg_cron (Dashboard → Database → Extensions). See
-- supabase/migrations/0002_points_retention.sql.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.purge_old_points_transactions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.points_transactions
  WHERE watched_at < now() - interval '28 hours';
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-points-transactions') THEN
    PERFORM cron.unschedule('purge-old-points-transactions');
  END IF;

  PERFORM cron.schedule(
    'purge-old-points-transactions',
    '0 * * * *',
    $cron$ SELECT public.purge_old_points_transactions(); $cron$
  );
END $$;

-- ─── Auth Settings (configure in Supabase Dashboard) ───────────────────────
-- Authentication → Providers → Phone: Enable, set OTP expiry to 600 seconds
-- Use Twilio or Supabase built-in SMS for Nigerian numbers (+234)
-- Authentication → Providers → Email: Enable (optional, for profile security)
