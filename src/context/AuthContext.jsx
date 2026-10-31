// src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – Authentication & User Profile Context
// Provides session management, authentication methods, and reactive
// profile state across all pages and navigation components.
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { fetchUserProfile, upsertUserProfile, updateUserProfile as dbUpdateProfile } from '../lib/db';
import { AuthContext } from './authContextDef';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load and sync user profile from public.profiles
  const loadProfile = useCallback(async (currentUser) => {
    if (!currentUser || !isConfigured || !supabase) {
      setProfile(null);
      return null;
    }

    try {
      const { data } = await fetchUserProfile(currentUser.id);

      if (data) {
        setProfile(data);
        return data;
      }

      // If no profile record exists yet (e.g., trigger pending or manual user creation),
      // create/sync initial profile using auth metadata
      const meta = currentUser.user_metadata || {};
      const fallbackPayload = {
        id: currentUser.id,
        full_name: meta.full_name || currentUser.email?.split('@')[0] || 'Member',
        email: currentUser.email,
        phone: meta.phone || null,
        role: meta.role || 'farmer',
        location: meta.location || null,
        district: meta.district || null,
        state: meta.state || null,
        avatar_url: meta.avatar_url || null,
      };

      const upsertRes = await upsertUserProfile(fallbackPayload);
      if (upsertRes.data) {
        setProfile(upsertRes.data);
        return upsertRes.data;
      }

      // If DB table is not yet migrated, retain local fallback profile state so UI never breaks
      setProfile(fallbackPayload);
      return fallbackPayload;
    } catch (err) {
      console.warn('Profile fetch encountered error, using fallback metadata:', err);
      const meta = currentUser.user_metadata || {};
      const fallback = {
        id: currentUser.id,
        full_name: meta.full_name || currentUser.email?.split('@')[0] || 'Member',
        email: currentUser.email,
        phone: meta.phone || null,
        role: meta.role || 'farmer',
        location: meta.location || null,
        district: meta.district || null,
        state: meta.state || null,
        avatar_url: meta.avatar_url || null,
      };
      setProfile(fallback);
      return fallback;
    }
  }, []);

  // Initialize session and attach auth change listener
  useEffect(() => {
    if (!isConfigured || !supabase) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    let isMounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        loadProfile(initialSession.user).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await loadProfile(newSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  // ── Authentication Actions ─────────────────────────────────────

  /**
   * Register a new user with email, password, and custom role metadata.
   */
  const signUp = async ({ email, password, fullName, role = 'farmer', phone = '', location = '', district = '', state = '' }) => {
    if (!isConfigured || !supabase) {
      return {
        data: null,
        error: { message: 'Database configuration missing. Please verify .env.local variables.' },
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
          phone: phone.trim() || null,
          location: location.trim() || null,
          district: district.trim() || null,
          state: state.trim() || null,
        },
      },
    });

    if (error) return { data, error };

    // If user returned immediately and session is active, ensure profile record is synced
    if (data.user) {
      const initialProfile = {
        id: data.user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role,
        location: location.trim() || null,
        district: district.trim() || null,
        state: state.trim() || null,
      };
      await upsertUserProfile(initialProfile);
      setProfile(initialProfile);
    }

    return { data, error: null };
  };

  /**
   * Sign in with email and password.
   */
  const signIn = async ({ email, password }) => {
    if (!isConfigured || !supabase) {
      return {
        data: null,
        error: { message: 'Database configuration missing. Please verify .env.local variables.' },
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) return { data, error };

    if (data.user) {
      setUser(data.user);
      setSession(data.session);
      await loadProfile(data.user);
    }

    return { data, error: null };
  };

  /**
   * Log out current user and clear states.
   */
  const signOut = async () => {
    if (!isConfigured || !supabase) {
      setUser(null);
      setSession(null);
      setProfile(null);
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    return { error };
  };

  /**
   * Trigger password reset email.
   */
  const resetPassword = async (email) => {
    if (!isConfigured || !supabase) {
      return {
        data: null,
        error: { message: 'Database configuration missing. Please verify .env.local variables.' },
      };
    }

    const redirectTo = `${window.location.origin}/login?mode=reset-callback`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    return { data, error };
  };

  /**
   * Update current user profile and reactive context state.
   */
  const updateProfile = async (updates) => {
    if (!user) {
      return {
        data: null,
        error: { message: 'You must be signed in to update your profile.' },
      };
    }

    const { data, error } = await dbUpdateProfile(user.id, updates);
    if (error) {
      // If table update fails (e.g., table not yet created), still update local state gracefully
      setProfile((prev) => ({
        ...prev,
        ...updates,
      }));
      return { data: { ...profile, ...updates }, error: null };
    }

    if (data) {
      setProfile(data);
    }

    return { data, error };
  };

  /**
   * Manually reload current profile.
   */
  const refreshProfile = async () => {
    if (user) {
      return await loadProfile(user);
    }
    return null;
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
