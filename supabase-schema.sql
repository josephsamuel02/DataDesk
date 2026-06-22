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
  points INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Auth Settings ──────────────────────────────────────────────────────────
-- Authentication → Providers → Email: ENABLE
-- Authentication → Providers → Phone: can be disabled for now
-- Enable "Confirm email" in Auth → Settings if you want email verification
-- (If disabled, users are logged in immediately after signUp)

-- 2. Ad types
CREATE TABLE IF NOT EXISTS ad_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  points_reward INTEGER NOT NULL,
  duration_seconds INTEGER,
  description TEXT
);

-- 3. Seed default ad types
INSERT INTO ad_types (name, points_reward, duration_seconds, description) VALUES
  ('Full Screen Video', 4, 30, 'Watch a full 30-second video ad'),
  ('Banner Plus', 3, 20, 'Watch a medium video ad'),
  ('Standard', 2, 15, 'Watch a standard banner ad'),
  ('Mini Ad', 1, 10, 'Quick mini ad')
ON CONFLICT DO NOTHING;

-- 4. Points transactions
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ad_type_id UUID REFERENCES ad_types(id),
  points_earned INTEGER NOT NULL,
  watched_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- Run in Supabase Dashboard → Storage → Create bucket named "avatars"
-- Set bucket to PUBLIC
-- Then add this policy:

-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- CREATE POLICY "Avatar upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Avatar access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- ─── Auth Settings (configure in Supabase Dashboard) ───────────────────────
-- Authentication → Providers → Phone: Enable, set OTP expiry to 600 seconds
-- Use Twilio or Supabase built-in SMS for Nigerian numbers (+234)
-- Authentication → Providers → Email: Enable (optional, for profile security)
