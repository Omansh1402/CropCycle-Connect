# CropCycle Connect — Supabase Integration Guide

## What was built

Three Supabase tables are now connected to the UI:

| Table | Connected to |
|---|---|
| `farmer_listings` | Farmer form submit + Dashboard Listings tab |
| `buyer_requirements` | Buyer form submit + Dashboard Buyers tab |
| `contact_requests` | Match Details contact form + Dashboard Requests tab |

**Without credentials:** app runs in demo mode — forms show a setup banner, Dashboard shows sample data, no DB calls made.
**With credentials:** forms persist to Supabase, Dashboard fetches live records, success states show real UUIDs.

---

## Step 1: Create a Supabase project

1. Go to **supabase.com** → sign in → **New project**
2. Name it (e.g. `cropcycle-connect`) and set a strong database password
3. Choose a region close to you and wait ~2 minutes to initialise

---

## Step 2: Run the SQL schema

1. In your Supabase dashboard → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this project root
3. Paste the entire file and click **Run**

This creates:
- `farmer_listings` (quantity_tonnes, residue_type, status, is_demo flag)
- `buyer_requirements` (accepted_types text[], required_quantity_tonnes, availability_status)
- `contact_requests` (linked to both tables, demo_buyer_ref for sample profiles)
- Row Level Security: public read + public insert (no auth required for demo)
- `updated_at` triggers on all tables
- 4 demo farmer rows + 3 demo buyer rows (`is_demo = true`)

---

## Step 3: Create `.env.local`

In the **project root** (same folder as `package.json`), create `.env.local`:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Where to find these:
- Supabase Dashboard → **Settings** (gear icon) → **API**
- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon public** key → `VITE_SUPABASE_ANON_KEY`

> NEVER use the `service_role` key in frontend code — it bypasses Row Level Security.

---

## Step 4: Restart the dev server

```bash
npm run dev
```

The blue setup banner disappears, the green pulsing dot appears in the Farmer/Buyer sidebars, and the Dashboard shows "Live database."

---

## Exact environment variable names

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Both require the `VITE_` prefix for Vite to expose them to the browser.

---

## Testing

### Test 1 — Farmer listing
1. Go to /farmer and submit the form
2. Success page shows: `Saved to database (ID: <uuid>)`
3. Dashboard → Listings tab → green **Real** badge on your row

### Test 2 — Buyer requirement
1. Go to /buyer and submit
2. Success shows Supabase record UUID
3. Dashboard → Buyers tab shows your row

### Test 3 — Contact request
1. Go to /matches → View Details on any buyer
2. Fill in the contact form and send
3. Success shows `contact_requests` record UUID
4. Dashboard → Requests tab shows your entry

### Test 4 — Verify via SQL Editor

```sql
SELECT id, farmer_name, residue_type, quantity_tonnes, is_demo, created_at
FROM farmer_listings ORDER BY created_at DESC LIMIT 10;

SELECT id, org_name, accepted_types, required_quantity_tonnes, is_demo
FROM buyer_requirements ORDER BY created_at DESC LIMIT 10;

SELECT id, request_type, demo_buyer_ref, status, created_at
FROM contact_requests ORDER BY created_at DESC LIMIT 10;
```

---

## Access limitations (no auth)

This demo uses **no authentication**. The anon key allows public read + insert only.

| Action | Status |
|---|---|
| Any visitor can submit a listing / buyer profile | YES |
| Any visitor can read all records | YES |
| Any visitor can submit a contact request | YES |
| Records are privately scoped per user | NO |
| Frontend can UPDATE or DELETE records | NO |

To add user isolation later, add `auth.uid() = user_id` RLS policies after implementing Supabase Auth.

---

## Files changed

| File | Change |
|---|---|
| `src/lib/supabase.js` | Client with `isConfigured` guard |
| `src/lib/db.js` | CRUD functions for all 3 tables |
| `src/components/DbStatus.jsx` | Setup banner, error alert, spinner |
| `src/pages/Farmer.jsx` | Async submit, loading/error states, DB indicator |
| `src/pages/Buyer.jsx` | Async submit, loading/error states, cross-validation |
| `src/pages/MatchDetails.jsx` | Contact form persists to DB |
| `src/pages/Dashboard.jsx` | Fetches live data, falls back to sample data |
| `supabase/schema.sql` | Tables, RLS, triggers, seed data |
| `.env.example` | Exact env var names documented |
| `.gitignore` | `.env.local` excluded from git |
