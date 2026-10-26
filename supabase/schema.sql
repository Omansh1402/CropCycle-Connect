-- ================================================================
-- CropCycle Connect – Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- ── 1. Farmer Residue Listings ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.farmer_listings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Farmer identity
  farmer_name         text        NOT NULL CHECK (char_length(farmer_name) >= 2),
  contact_phone       text,
  contact_email       text        CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),

  -- Residue details
  residue_type        text        NOT NULL,   -- must match RESIDUE_TYPES values
  quantity_tonnes     numeric     NOT NULL CHECK (quantity_tonnes > 0),

  -- Location
  location            text        NOT NULL,   -- village / farm description
  district            text,
  state               text        NOT NULL,

  -- Availability
  availability_date   date        NOT NULL,
  pickup_preference   text        NOT NULL,
  notes               text,

  -- Status
  status              text        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'pending', 'matched', 'closed')),
  is_demo             boolean     NOT NULL DEFAULT false  -- true = sample data rows
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farmer_listings_updated_at
  BEFORE UPDATE ON public.farmer_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. Buyer Requirements ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buyer_requirements (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Organisation
  org_name            text        NOT NULL CHECK (char_length(org_name) >= 2),
  org_type            text,
  contact_person      text,
  contact_email       text        CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  contact_phone       text,

  -- Requirements
  accepted_types      text[]      NOT NULL,   -- array of residue type strings
  required_quantity_tonnes  numeric NOT NULL CHECK (required_quantity_tonnes > 0),
  max_intake_tonnes   numeric     CHECK (max_intake_tonnes > 0),
  intended_use        text        NOT NULL,

  -- Location
  location            text        NOT NULL,
  state               text        NOT NULL,

  -- Status
  availability_status text        NOT NULL DEFAULT 'yes'
                                  CHECK (availability_status IN ('yes', 'no', 'limited')),
  notes               text,
  is_demo             boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER buyer_requirements_updated_at
  BEFORE UPDATE ON public.buyer_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 3. Contact / Pickup Requests ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Links
  listing_id          uuid        REFERENCES public.farmer_listings(id) ON DELETE SET NULL,
  buyer_id            uuid        REFERENCES public.buyer_requirements(id) ON DELETE SET NULL,

  -- For requests against sample/demo buyers (stored as text IDs like 'B001')
  demo_buyer_ref      text,

  -- Request details
  request_type        text        NOT NULL DEFAULT 'pickup'
                                  CHECK (request_type IN ('pickup', 'contact', 'quote')),
  message             text        NOT NULL CHECK (char_length(message) >= 10),

  -- Requester info (denormalised for convenience)
  requester_name      text,
  requester_email     text,

  -- Status
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  is_demo             boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 4. Row Level Security ────────────────────────────────────────
-- Allow anyone to INSERT (public form submissions).
-- Allow anyone to SELECT (marketplace-style visibility).
-- In production you would restrict this to authenticated users or add policies.

ALTER TABLE public.farmer_listings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests   ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read farmer_listings"
  ON public.farmer_listings FOR SELECT USING (true);

CREATE POLICY "Public read buyer_requirements"
  ON public.buyer_requirements FOR SELECT USING (true);

CREATE POLICY "Public read contact_requests"
  ON public.contact_requests FOR SELECT USING (true);

-- Public insert (anon key can submit forms)
CREATE POLICY "Public insert farmer_listings"
  ON public.farmer_listings FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert buyer_requirements"
  ON public.buyer_requirements FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert contact_requests"
  ON public.contact_requests FOR INSERT WITH CHECK (true);

-- ── 4.1 Role Privileges ──────────────────────────────────────────
-- Grant table and sequence access to public/anon client roles so RLS policies can evaluate
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;


-- ── 5. Demo Seed Data ────────────────────────────────────────────
-- Clearly labelled as demonstration / sample rows (is_demo = true)
INSERT INTO public.farmer_listings
  (farmer_name, contact_phone, contact_email, residue_type, quantity_tonnes,
   location, district, state, availability_date, pickup_preference, status, is_demo)
VALUES
  ('Rajesh Patel [DEMO]',  '+91 98765 00101', 'rajesh.demo@example.com',
   'Paddy Straw',  18, 'Khambhat village', 'Anand',     'Gujarat',    '2026-11-10', 'Self-pickup by buyer',                'active',  true),
  ('Sunita Verma [DEMO]',  '+91 98765 00102', 'sunita.demo@example.com',
   'Wheat Straw',  32, 'Ludhiana outskirts','Ludhiana', 'Punjab',     '2026-11-18', 'Third-party logistics arranged',      'active',  true),
  ('Mohan Reddy [DEMO]',   '+91 98765 00103', 'mohan.demo@example.com',
   'Cotton Stalks', 7, 'Nalgonda taluk',   'Nalgonda', 'Telangana',  '2026-12-01', 'Farmer delivers to buyer',            'pending', true),
  ('Priya Nair [DEMO]',    '+91 98765 00104', 'priya.demo@example.com',
   'Banana Pseudostems', 4,'Palakkad town', 'Palakkad', 'Kerala',     '2026-11-05', 'Farmer delivers to buyer',            'matched', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.buyer_requirements
  (org_name, org_type, contact_email, accepted_types, required_quantity_tonnes,
   max_intake_tonnes, intended_use, location, state, availability_status, is_demo)
VALUES
  ('GreenFuel Renewables [DEMO]', 'Private Company', 'procurement.demo@greenfuel-example.com',
   ARRAY['Paddy Straw','Wheat Straw','Sugarcane Bagasse'], 50, 200,
   'Biofuel / Energy Generation', 'Vadodara Industrial Estate', 'Gujarat', 'yes', true),
  ('AgriCompost Cooperative [DEMO]','Cooperative Society','buy.demo@agricompost-example.com',
   ARRAY['Paddy Straw','Cotton Stalks','Groundnut Shells','Maize Stalks'], 20, 80,
   'Compost / Organic Fertiliser', 'Anand District', 'Gujarat', 'yes', true),
  ('BioGas India Initiative [DEMO]','Government Body','ops.demo@biogas-example.com',
   ARRAY['Sugarcane Bagasse','Cotton Stalks','Soybean Stalks'], 100, 500,
   'Bio-CNG Production', 'Hyderabad Outskirts', 'Telangana', 'yes', true)
ON CONFLICT DO NOTHING;
