-- ================================================================
-- CropCycle Connect – User Profiles & Authentication SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- ── 1. User Profiles Table ───────────────────────────────────────
-- Stores private profile information for registered farmers and buyers.
-- Linked directly to Supabase's auth.users table.
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Personal & Role details
  full_name           text        NOT NULL CHECK (char_length(full_name) >= 2),
  email               text,
  phone               text,
  role                text        NOT NULL DEFAULT 'farmer'
                                  CHECK (role IN ('farmer', 'buyer')),

  -- Location details
  location            text,       -- village or facility address
  district            text,
  state               text,

  -- Avatar (custom URL or null for auto-generated initials avatar)
  avatar_url          text
);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();


-- ── 2. Link Marketplace Tables to auth.users (Safe Optional Link) ─
-- Adds user_id foreign keys so listings and demand can be associated
-- with the authenticated profile when a logged-in user creates them.
ALTER TABLE public.farmer_listings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.buyer_requirements
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;


-- ── 3. Row Level Security (RLS) ──────────────────────────────────
-- Requirement: "Users must only be able to read and update their own private profile data."
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view ONLY their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Authenticated users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Authenticated users can update ONLY their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ── 4. Automatic Profile Creation on Signup Trigger ──────────────
-- Automatically creates a public.profiles record whenever a user
-- signs up via Supabase Auth (e.g., using email/password).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    location,
    district,
    state,
    avatar_url
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'farmer'),
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'district',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 5. Grants & Permissions ──────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
