// src/lib/auth.js
// ─────────────────────────────────────────────────────────────────
// DEMO AUTH for the hackathon: accounts live in this browser's localStorage.
// Not secure and not shared between devices. Every screen uses only the
// functions exported here, so a teammate can later swap the internals for
// Supabase Auth without touching any UI file.
// ─────────────────────────────────────────────────────────────────

const USERS_KEY = 'cropcycle_users';
const SESSION_KEY = 'cropcycle_user';
const ONBOARDED_KEY = 'cropcycle_onboarded';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Keeps the last 10 digits so "+91 98765 43210" and "9876543210" match. */
export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

export function isValidPhone(phone) {
  return normalizePhone(phone).length === 10;
}

/** Returns the logged-in user ({ name, phone, role, district }) or null. */
export function currentUser() {
  return read(SESSION_KEY, null);
}

/**
 * Creates an account and logs it in.
 * Returns { ok: true, user } or { ok: false, error: 'exists' | 'storage' }.
 */
export function register({ name, phone, role, district }) {
  const key = normalizePhone(phone);
  const users = read(USERS_KEY, {});
  if (users[key]) return { ok: false, error: 'exists' };

  const user = {
    name: String(name).trim(),
    phone: key,
    role: role === 'buyer' ? 'buyer' : 'farmer',
    district: String(district).trim(),
  };
  users[key] = user;
  if (!write(USERS_KEY, users) || !write(SESSION_KEY, user)) {
    return { ok: false, error: 'storage' };
  }
  return { ok: true, user };
}

/**
 * Logs in with a mobile number (demo: no password).
 * Returns { ok: true, user } or { ok: false, error: 'notFound' | 'storage' }.
 */
export function login({ phone }) {
  const users = read(USERS_KEY, {});
  const user = users[normalizePhone(phone)];
  if (!user) return { ok: false, error: 'notFound' };
  if (!write(SESSION_KEY, user)) return { ok: false, error: 'storage' };
  return { ok: true, user };
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable
  }
}

/** True once the visitor has finished (or skipped past) the welcome screen. */
export function hasOnboarded() {
  return read(ONBOARDED_KEY, false) === true;
}

export function markOnboarded() {
  write(ONBOARDED_KEY, true);
}
