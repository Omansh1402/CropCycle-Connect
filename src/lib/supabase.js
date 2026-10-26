// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────────
// Supabase client – uses the anon (public) key only.
// The service_role key is NEVER used in frontend code.
//
// Required .env.local variables:
//   VITE_SUPABASE_URL      – Your project URL (no trailing slash)
//   VITE_SUPABASE_ANON_KEY – Your project's anon/public key
// ─────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * isConfigured – true only when both env vars are set and look valid.
 * When false, all DB functions return graceful offline-mode errors
 * rather than crashing the app.
 */
export const isConfigured =
  typeof supabaseUrl  === 'string' && supabaseUrl.startsWith('https://') &&
  typeof supabaseAnon === 'string' && supabaseAnon.length > 20;

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnon)
  : null;
