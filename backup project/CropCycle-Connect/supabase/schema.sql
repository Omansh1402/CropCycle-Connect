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

  -- Commercial & Quality Terms
  asking_price_per_tonne  numeric CHECK (asking_price_per_tonne >= 0),
  is_price_negotiable     boolean DEFAULT true,
  price_condition         text DEFAULT 'farm_gate',
  moisture_percent        numeric CHECK (moisture_percent >= 0 AND moisture_percent <= 100),
  residue_form            text DEFAULT 'baled',

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

  -- Commercial Terms & Purchasing Purpose
  offered_price_per_tonne  numeric CHECK (offered_price_per_tonne >= 0),
  purchasing_purpose       text,
  is_price_negotiable      boolean DEFAULT true,
  delivery_term_preference text DEFAULT 'delivered',
  max_acceptable_moisture numeric CHECK (max_acceptable_moisture >= 0 AND max_acceptable_moisture <= 100),
  preferred_residue_form   text DEFAULT 'baled',

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


-- ── 4. State-Wise Crop Residue Statistics Table ─────────────────
CREATE TABLE IF NOT EXISTS public.state_residue_statistics (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  state                       text NOT NULL,
  district                    text,
  crop_type                   text NOT NULL,
  residue_type                text NOT NULL,
  reporting_year              text NOT NULL,
  crop_production_tonnes      numeric NOT NULL CHECK (crop_production_tonnes >= 0),
  residue_generated_tonnes    numeric NOT NULL CHECK (residue_generated_tonnes >= 0),
  surplus_tonnes              numeric CHECK (surplus_tonnes >= 0),
  collectable_tonnes          numeric CHECK (collectable_tonnes >= 0),
  existing_uses_tonnes        numeric CHECK (existing_uses_tonnes >= 0),
  potential_available_tonnes  numeric CHECK (potential_available_tonnes >= 0),
  rpr_ratio                   numeric,
  source_name                 text NOT NULL,
  source_url                  text,
  methodology                 text,
  last_updated                timestamptz NOT NULL DEFAULT now()
);


-- ── 5. Transport Rate Configurations Table ───────────────────────
CREATE TABLE IF NOT EXISTS public.transport_rate_configs (
  vehicle_type                text PRIMARY KEY,
  label                       text NOT NULL,
  category                    text NOT NULL,
  payload_tonnes              numeric NOT NULL CHECK (payload_tonnes > 0),
  rate_per_km                 numeric NOT NULL CHECK (rate_per_km >= 0),
  fixed_trip_charge           numeric NOT NULL CHECK (fixed_trip_charge >= 0),
  toll_rate_per_km            numeric NOT NULL DEFAULT 0,
  loading_per_tonne           numeric NOT NULL DEFAULT 0,
  unloading_per_tonne         numeric NOT NULL DEFAULT 0,
  interstate_permit_fee       numeric NOT NULL DEFAULT 0,
  updated_at                  timestamptz NOT NULL DEFAULT now()
);


-- ── 6. Market Price References Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_price_references (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  residue_type                text NOT NULL UNIQUE,
  min_price_inr               numeric NOT NULL,
  max_price_inr               numeric NOT NULL,
  typical_rate_inr            numeric NOT NULL,
  price_unit                  text NOT NULL DEFAULT 'INR / tonne',
  delivery_condition          text,
  source_name                 text NOT NULL,
  reporting_year              text NOT NULL,
  last_verified               timestamptz NOT NULL DEFAULT now()
);


-- ── 7. Row Level Security ────────────────────────────────────────
ALTER TABLE public.farmer_listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_requirements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_residue_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_rate_configs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_references  ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read farmer_listings"
  ON public.farmer_listings FOR SELECT USING (true);

CREATE POLICY "Public read buyer_requirements"
  ON public.buyer_requirements FOR SELECT USING (true);

CREATE POLICY "Public read contact_requests"
  ON public.contact_requests FOR SELECT USING (true);

CREATE POLICY "Public read state_residue_statistics"
  ON public.state_residue_statistics FOR SELECT USING (true);

CREATE POLICY "Public read transport_rate_configs"
  ON public.transport_rate_configs FOR SELECT USING (true);

CREATE POLICY "Public read market_price_references"
  ON public.market_price_references FOR SELECT USING (true);

-- Public insert (anon key can submit forms)
CREATE POLICY "Public insert farmer_listings"
  ON public.farmer_listings FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert buyer_requirements"
  ON public.buyer_requirements FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert contact_requests"
  ON public.contact_requests FOR INSERT WITH CHECK (true);

-- Role Privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;


-- ── 8. Demo & Reference Seed Data ─────────────────────────────────
INSERT INTO public.farmer_listings
  (farmer_name, contact_phone, contact_email, residue_type, quantity_tonnes,
   location, district, state, availability_date, pickup_preference, asking_price_per_tonne, is_price_negotiable, price_condition, status, is_demo)
VALUES
  ('Rajesh Patel [DEMO]',  '+91 98765 00101', 'rajesh.demo@example.com',
   'Paddy Straw',  18, 'Khambhat village', 'Anand',     'Gujarat',    '2026-11-10', 'Self-pickup by buyer', 2100, true, 'farm_gate', 'active',  true),
  ('Sunita Verma [DEMO]',  '+91 98765 00102', 'sunita.demo@example.com',
   'Wheat Straw',  32, 'Ludhiana outskirts','Ludhiana', 'Punjab',     '2026-11-18', 'Third-party logistics arranged', 4500, true, 'farm_gate', 'active',  true),
  ('Mohan Reddy [DEMO]',   '+91 98765 00103', 'mohan.demo@example.com',
   'Cotton Stalks', 7, 'Nalgonda taluk',   'Nalgonda', 'Telangana',  '2026-12-01', 'Farmer delivers to buyer', 2600, false, 'delivered', 'pending', true),
  ('Priya Nair [DEMO]',    '+91 98765 00104', 'priya.demo@example.com',
   'Banana Pseudostems', 4,'Palakkad town', 'Palakkad', 'Kerala',     '2026-11-05', 'Farmer delivers to buyer', 1500, true, 'farm_gate', 'matched', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.buyer_requirements
  (org_name, org_type, contact_email, accepted_types, required_quantity_tonnes,
   max_intake_tonnes, intended_use, purchasing_purpose, offered_price_per_tonne, is_price_negotiable, location, state, availability_status, is_demo)
VALUES
  ('GreenFuel Renewables [DEMO]', 'Private Company', 'procurement.demo@greenfuel-example.com',
   ARRAY['Paddy Straw','Wheat Straw','Sugarcane Bagasse'], 50, 200,
   'Biofuel / Energy Generation', 'Biofuel Production', 2200, true, 'Vadodara Industrial Estate', 'Gujarat', 'yes', true),
  ('AgriCompost Cooperative [DEMO]','Cooperative Society','buy.demo@agricompost-example.com',
   ARRAY['Paddy Straw','Cotton Stalks','Groundnut Shells','Maize Stalks'], 20, 80,
   'Compost / Organic Fertiliser', 'Compost and Organic Fertilizer', 1900, true, 'Anand District', 'Gujarat', 'yes', true),
  ('BioGas India Initiative [DEMO]','Government Body','ops.demo@biogas-example.com',
   ARRAY['Sugarcane Bagasse','Cotton Stalks','Soybean Stalks'], 100, 500,
   'Bio-CNG Production', 'Biogas Production', 2400, false, 'Hyderabad Outskirts', 'Telangana', 'yes', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.transport_rate_configs
  (vehicle_type, label, category, payload_tonnes, rate_per_km, fixed_trip_charge, toll_rate_per_km, loading_per_tonne, unloading_per_tonne, interstate_permit_fee)
VALUES
  ('tractor_trolley', 'Tractor Trolley', 'Local Farm Transit (< 60 km)', 4, 32, 800, 0, 150, 150, 0),
  ('small_truck', 'Small Commercial Truck (Tata 407/709)', 'Intra-District & Short Haul (50–250 km)', 8, 38, 1500, 3.5, 180, 180, 600),
  ('medium_truck', 'Medium Commercial Truck (6–10 Wheeler)', 'Regional Haulage (150–600 km)', 15, 52, 2800, 5.5, 200, 200, 1000),
  ('heavy_truck', 'Heavy Goods Multi-Axle Truck (12–14 Wheeler)', 'Interstate Long-Haul (> 500 km)', 28, 68, 4500, 8.5, 220, 220, 1400)
ON CONFLICT (vehicle_type) DO UPDATE SET
  rate_per_km = EXCLUDED.rate_per_km,
  fixed_trip_charge = EXCLUDED.fixed_trip_charge,
  toll_rate_per_km = EXCLUDED.toll_rate_per_km;

INSERT INTO public.market_price_references
  (residue_type, min_price_inr, max_price_inr, typical_rate_inr, price_unit, delivery_condition, source_name, reporting_year)
VALUES
  ('Paddy Straw', 1800, 2400, 2100, 'INR / tonne', 'Farm-gate (Baled, moisture < 16%)', 'CPCB Guidelines on Statutory Biomass Pricing & PEDA', '2023-24'),
  ('Wheat Straw', 3800, 5600, 4500, 'INR / tonne', 'Farm-gate (Chopped Bhusa dry fodder)', 'Haryana Gau Seva Aayog & DES Mandi Bulletin', '2023-24'),
  ('Sugarcane Bagasse', 2200, 2800, 2500, 'INR / tonne', 'Ex-mill yard (50% moisture as generated)', 'Indian Sugar Mills Association (ISMA) & Cogen India', '2023-24'),
  ('Cotton Stalks', 2200, 3000, 2600, 'INR / tonne', 'Ex-farm field (Uprooted & bundled, moisture < 15%)', 'CIRCOT & Bioenergy Report', '2023-24'),
  ('Mustard Stalks', 2400, 3200, 2800, 'INR / tonne', 'Farm-gate (Dry stalks)', 'Rajasthan Renewable Energy Corporation (RREC)', '2023-24'),
  ('Maize Stalks', 1900, 2600, 2250, 'INR / tonne', 'Farm-gate (Dried stover)', 'ICAR-IIMR Biomass Bulletin', '2023-24'),
  ('Groundnut Shells', 3800, 4800, 4200, 'INR / tonne', 'Ex-decorticator mill (Dry shells < 10% moisture)', 'Gujarat Bio Energy Association', '2023-24'),
  ('Soybean Stalks', 2000, 2700, 2350, 'INR / tonne', 'Farm-gate (Dry threshed straw)', 'Madhya Pradesh Urja Vikas Nigam (MPUVNL)', '2023-24')
ON CONFLICT (residue_type) DO UPDATE SET
  min_price_inr = EXCLUDED.min_price_inr,
  max_price_inr = EXCLUDED.max_price_inr,
  typical_rate_inr = EXCLUDED.typical_rate_inr;
