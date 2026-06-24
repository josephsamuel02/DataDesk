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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for existing databases: add columns if the table predates them.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_bonus_at DATE;

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

-- 3. Seed default ad types (names MUST match constants/adTypes.ts)
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

  UPDATE public.profiles
    SET points = points + bonus, last_daily_bonus_at = CURRENT_DATE
    WHERE id = uid
    RETURNING points INTO new_total;

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

-- ─── Auth Settings (configure in Supabase Dashboard) ───────────────────────
-- Authentication → Providers → Phone: Enable, set OTP expiry to 600 seconds
-- Use Twilio or Supabase built-in SMS for Nigerian numbers (+234)
-- Authentication → Providers → Email: Enable (optional, for profile security)
