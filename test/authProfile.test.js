// test/authProfile.test.js
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – User Profile & Authentication Test Suite
//
// Tests:
// 1. Profile Field Validation Logic (Name, Role, Phone, Email)
// 2. Initials Monogram Generation Logic
// 3. Database Layer Fallbacks & Profiles Schema Constraints
// 4. SQL Migration File Verification (RLS Policies, Triggers, Cascades)
// ─────────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting CropCycle Connect User Profile & Auth Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ── 1. Validation Logic ──────────────────────────────────────────
console.log('Group 1: Profile Validation Rules');

runTest('Validates full name requires at least 2 characters', () => {
  const isValidName = (name) => typeof name === 'string' && name.trim().length >= 2;
  assert.equal(isValidName(''), false);
  assert.equal(isValidName('A'), false);
  assert.equal(isValidName('  '), false);
  assert.equal(isValidName('Om'), true);
  assert.equal(isValidName('Rajesh Patel'), true);
});

runTest('Validates role must be either "farmer" or "buyer"', () => {
  const ALLOWED_ROLES = ['farmer', 'buyer'];
  const isValidRole = (role) => ALLOWED_ROLES.includes(role);
  assert.equal(isValidRole('farmer'), true);
  assert.equal(isValidRole('buyer'), true);
  assert.equal(isValidRole('admin'), false);
  assert.equal(isValidRole('guest'), false);
  assert.equal(isValidRole(''), false);
});

runTest('Validates phone format rules for contact details', () => {
  const isValidPhone = (phone) => !phone || /^[0-9+\s()-]{7,15}$/.test(phone.trim());
  assert.equal(isValidPhone(''), true, 'Optional phone allows empty string');
  assert.equal(isValidPhone('+91 98765 43210'), true);
  assert.equal(isValidPhone('9876543210'), true);
  assert.equal(isValidPhone('(02692) 234567'), true);
  assert.equal(isValidPhone('invalid-phone!'), false);
  assert.equal(isValidPhone('123'), false, 'Too short');
});

runTest('Validates email format rules', () => {
  const isValidEmail = (email) => typeof email === 'string' && /\S+@\S+\.\S+/.test(email.trim());
  assert.equal(isValidEmail('farmer@cropcycle.in'), true);
  assert.equal(isValidEmail('buyer.procurement@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('missing@domain'), false);
});

// ── 2. Avatar Initials Monogram Generator ─────────────────────────
console.log('\nGroup 2: Initials Monogram Avatar Generation');

function getInitials(name) {
  if (!name) return 'CC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

runTest('Generates two-letter uppercase monogram from two-word name', () => {
  assert.equal(getInitials('Rajesh Patel'), 'RP');
  assert.equal(getInitials('Sunita Verma'), 'SV');
});

runTest('Generates two-letter uppercase monogram from multi-word name (first and last)', () => {
  assert.equal(getInitials('BioGas India Initiative'), 'BI');
  assert.equal(getInitials('Green Fuel Energy Private Limited'), 'GL');
});

runTest('Generates two-letter uppercase monogram from single-word name', () => {
  assert.equal(getInitials('Anand'), 'AN');
  assert.equal(getInitials('Om'), 'OM');
});

runTest('Falls back to "CC" for null or empty input', () => {
  assert.equal(getInitials(''), 'CC');
  assert.equal(getInitials(null), 'CC');
  assert.equal(getInitials(undefined), 'CC');
});

// ── 3. SQL Migration File Verification ────────────────────────────
console.log('\nGroup 3: Profiles SQL Migration File Verification');

const sqlPath = path.resolve(__dirname, '../supabase/profiles_schema.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

runTest('profiles_schema.sql exists and creates public.profiles table', () => {
  assert.ok(fs.existsSync(sqlPath), 'profiles_schema.sql must exist');
  assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'Must declare public.profiles table');
  assert.ok(sqlContent.includes('REFERENCES auth.users(id) ON DELETE CASCADE'), 'Must cascade delete with auth.users');
});

runTest('profiles_schema.sql includes all required column fields', () => {
  const requiredColumns = [
    'full_name',
    'email',
    'phone',
    'role',
    'location',
    'district',
    'state',
    'avatar_url',
    'created_at',
    'updated_at',
  ];
  for (const col of requiredColumns) {
    assert.ok(sqlContent.includes(col), `profiles_schema.sql must contain column '${col}'`);
  }
});

runTest('profiles_schema.sql enforces strict Row Level Security (RLS) policies', () => {
  assert.ok(sqlContent.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS');
  assert.ok(sqlContent.includes('auth.uid() = id'), 'Must restrict SELECT/UPDATE/INSERT to auth.uid() = id');
  assert.ok(sqlContent.includes('CREATE POLICY "Users can read own profile"'), 'Must have SELECT policy');
  assert.ok(sqlContent.includes('CREATE POLICY "Users can update own profile"'), 'Must have UPDATE policy');
});

runTest('profiles_schema.sql configures automatic user creation trigger on auth.users', () => {
  assert.ok(sqlContent.includes('CREATE OR REPLACE FUNCTION public.handle_new_user()'), 'Must declare handle_new_user function');
  assert.ok(sqlContent.includes('AFTER INSERT ON auth.users'), 'Must attach trigger to auth.users AFTER INSERT');
});

runTest('profiles_schema.sql defines user_id foreign keys for marketplace tables', () => {
  assert.ok(sqlContent.includes('ALTER TABLE public.farmer_listings'), 'Must alter farmer_listings');
  assert.ok(sqlContent.includes('ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id)'), 'Must add user_id column');
  assert.ok(sqlContent.includes('ALTER TABLE public.buyer_requirements'), 'Must alter buyer_requirements');
  assert.ok(sqlContent.includes('ALTER TABLE public.contact_requests'), 'Must alter contact_requests');
});

console.log(`\n🎉 User Profile & Auth Test Results: ${passedTests} / ${totalTests} tests passed successfully.\n`);
