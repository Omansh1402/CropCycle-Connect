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

---

## User Profiles & Authentication Setup

A dedicated User Profile system has been added to provide authenticated identities for **Farmers** and **Buyers / Organizations**.

### Step 5: Run the User Profiles SQL Schema

1. Go to your **Supabase Dashboard** → **SQL Editor** → **New query**.
2. Open `supabase/profiles_schema.sql` from this project root.
3. Paste the contents and click **Run**.

This migration script establishes:
- `public.profiles` table:
  - `id` (references `auth.users(id)` ON DELETE CASCADE)
  - `full_name` (text, min length 2)
  - `email` (text)
  - `phone` (text)
  - `role` ('farmer' | 'buyer')
  - `location` (text)
  - `district` (text)
  - `state` (text)
  - `avatar_url` (text)
  - `created_at` and `updated_at` (timestamptz with auto-update trigger)
- **Row Level Security (RLS)**:
  - `SELECT`: Restricted to `auth.uid() = id` (private profile data).
  - `INSERT`: Restricted to `auth.uid() = id`.
  - `UPDATE`: Restricted to `auth.uid() = id`.
- **Automatic User Signup Trigger**:
  - `handle_new_user()` trigger on `auth.users` automatically creates the initial `public.profiles` row from metadata when a user registers.
- **Table Association Columns**:
  - Adds optional `user_id uuid REFERENCES auth.users(id)` to `farmer_listings`, `buyer_requirements`, and `contact_requests`.

---

## Files changed

| File | Change |
|---|---|
| `supabase/profiles_schema.sql` | SQL migration for `profiles` table, strict private RLS, triggers, and foreign keys |
| `src/context/AuthContext.jsx` | React context providing Supabase auth session, reactive profile state, login, signup, logout, and password recovery |
| `src/pages/Profile.jsx` / `Profile.css` | User profile page with view mode, edit mode, validation, avatar initials, and quick links |
| `src/pages/Auth.jsx` / `Auth.css` | Authentication page with Sign In, Sign Up (Farmer / Buyer selector), and Forgot Password |
| `src/components/Navbar.jsx` / `Navbar.css` | Desktop and mobile nav with Profile link, user avatar chip when logged in, clean SVG user icons, and Sign In action |
| `src/lib/db.js` | Added `fetchUserProfile`, `upsertUserProfile`, `updateUserProfile`, `fetchUserListings`, and safe `user_id` association |
| `src/pages/Farmer.jsx` | Auto pre-fills contact details when user is logged in; associates listings with authenticated `user_id` |
| `src/pages/Buyer.jsx` | Auto pre-fills organization details when user is logged in; associates buyer demands with authenticated `user_id` |
| `src/App.jsx` | Wrapped application in `AuthProvider` and registered `/profile`, `/login`, and `/auth` routes |

