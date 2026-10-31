-- ================================================================
-- CropCycle Connect – Migration: Market Intelligence, Pricing & Transport
-- Date: 2026-11-01
-- Description: Backward-compatible upgrade adding commercial price fields,
--              state-wise agricultural statistics, and transport rate tables.
-- ================================================================

-- ── 1. Enhance farmer_listings with Pricing & Quality Metadata ───
ALTER TABLE public.farmer_listings
  ADD COLUMN IF NOT EXISTS asking_price_per_tonne  numeric CHECK (asking_price_per_tonne >= 0),
  ADD COLUMN IF NOT EXISTS is_price_negotiable     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_condition         text DEFAULT 'farm_gate',
  ADD COLUMN IF NOT EXISTS moisture_percent        numeric CHECK (moisture_percent >= 0 AND moisture_percent <= 100),
  ADD COLUMN IF NOT EXISTS residue_form            text DEFAULT 'baled';

-- ── 2. Enhance buyer_requirements with Commercial Terms & Purpose ──
ALTER TABLE public.buyer_requirements
  ADD COLUMN IF NOT EXISTS offered_price_per_tonne  numeric CHECK (offered_price_per_tonne >= 0),
  ADD COLUMN IF NOT EXISTS purchasing_purpose       text,
  ADD COLUMN IF NOT EXISTS is_price_negotiable      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_term_preference text DEFAULT 'delivered',
  ADD COLUMN IF NOT EXISTS max_acceptable_moisture numeric CHECK (max_acceptable_moisture >= 0 AND max_acceptable_moisture <= 100),
  ADD COLUMN IF NOT EXISTS preferred_residue_form   text DEFAULT 'baled';

-- ── 3. State-Wise Crop Residue Statistics Table ─────────────────
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

-- ── 4. Transport Rate Configurations Table ───────────────────────
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

-- Seed verified vehicle freight configurations
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

-- ── 5. Market Price References Table ─────────────────────────────
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
  typical_rate_inr = EXCLUDED.typical_rate_inr,
  last_verified = now();

-- ── 6. Row Level Security & Access Grants ────────────────────────
ALTER TABLE public.state_residue_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_rate_configs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_references  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read state_residue_statistics"
  ON public.state_residue_statistics FOR SELECT USING (true);

CREATE POLICY "Public read transport_rate_configs"
  ON public.transport_rate_configs FOR SELECT USING (true);

CREATE POLICY "Public read market_price_references"
  ON public.market_price_references FOR SELECT USING (true);

GRANT SELECT ON public.state_residue_statistics TO anon, authenticated;
GRANT SELECT ON public.transport_rate_configs   TO anon, authenticated;
GRANT SELECT ON public.market_price_references  TO anon, authenticated;

