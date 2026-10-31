import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/useAuth';
import { isConfigured } from '../lib/supabase';
import { LoadingSpinner } from '../components/DbStatus';
import './Auth.css';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
];

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, resetPassword, loading: authLoading } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode') === 'signup'
    ? 'signup'
    : searchParams.get('mode') === 'forgot'
      ? 'forgot'
      : 'login';

  const redirectPath = searchParams.get('redirect') || '/profile';

  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'farmer', // 'farmer' | 'buyer'
    phone: '',
    state: '',
    district: '',
    location: '',
  });

  const [forgotEmail, setForgotEmail] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, authLoading, navigate, redirectPath]);

  // Handle mode change via tabs
  const handleTabChange = (newMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // ── Login Submit ───────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage(t('auth.errEmptyCredentials'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        if (error.message?.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage(t('auth.errInvalidCredentials'));
        } else if (error.message?.toLowerCase().includes('email not confirmed')) {
          setErrorMessage(t('auth.errEmailNotConfirmed'));
        } else {
          setErrorMessage(error.message || t('auth.errAuthFailed'));
        }
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch {
      setErrorMessage(t('farmer.errUnexpected', 'A connection error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Signup Submit ──────────────────────────────────────────────
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupForm.fullName.trim() || signupForm.fullName.trim().length < 2) {
      setErrorMessage(t('auth.errNameLength'));
      return;
    }

    if (!signupForm.email.trim() || !/\S+@\S+\.\S+/.test(signupForm.email)) {
      setErrorMessage(t('auth.errEmailInvalid'));
      return;
    }

    if (!signupForm.password || signupForm.password.length < 6) {
      setErrorMessage(t('auth.errPasswordLength'));
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setErrorMessage(t('auth.errPasswordsMismatch'));
      return;
    }

    if (signupForm.phone && !/^[0-9+\s()-]{7,15}$/.test(signupForm.phone.trim())) {
      setErrorMessage(t('auth.errPhoneFormat'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUp({
        fullName: signupForm.fullName,
        email: signupForm.email,
        password: signupForm.password,
        role: signupForm.role,
        phone: signupForm.phone,
        state: signupForm.state,
        district: signupForm.district,
        location: signupForm.location,
      });

      if (error) {
        if (error.message?.toLowerCase().includes('user already registered')) {
          setErrorMessage(t('auth.errUserExists'));
        } else {
          setErrorMessage(error.message || t('auth.errRegFailed'));
        }
        return;
      }

      if (data?.session) {
        setSuccessMessage(t('auth.successAccountCreated'));
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 800);
      } else {
        setSuccessMessage(t('auth.successAccountConfirm'));
        setMode('login');
        setLoginEmail(signupForm.email);
      }
    } catch {
      setErrorMessage(t('farmer.errUnexpected', 'An unexpected error occurred during registration. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Submit ─────────────────────────────────────
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setErrorMessage(t('auth.errEmailInvalid'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(forgotEmail);
      if (error) {
        setErrorMessage(error.message || t('farmer.errUnexpected', 'Failed to send reset email. Please try again.'));
        return;
      }

      setSuccessMessage(t('auth.successResetSent'));
    } catch {
      setErrorMessage(t('farmer.errUnexpected', 'A connection error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container-narrow">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-card__header">
            <div className="auth-brand-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C6.477 2 2 6.477 2 12C2 14.83 3.177 17.388 5.07 19.21L6.48 17.79C4.94 16.32 4 14.27 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 14.27 19.06 16.32 17.52 17.79L18.93 19.21C20.823 17.388 22 14.83 22 12C22 6.477 17.523 2 12 2Z" fill="currentColor" />
              </svg>
              <span>{t('auth.brandBadge')}</span>
            </div>

            <h1 className="auth-card__title">
              {mode === 'login' && t('auth.loginTitle')}
              {mode === 'signup' && t('auth.signupTitle')}
              {mode === 'forgot' && t('auth.forgotTitle')}
            </h1>
            <p className="auth-card__subtitle">
              {mode === 'login' && t('auth.loginSubtitle')}
              {mode === 'signup' && t('auth.signupSubtitle')}
              {mode === 'forgot' && t('auth.forgotSubtitle')}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' && (
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
                onClick={() => handleTabChange('login')}
                role="tab"
                aria-selected={mode === 'login'}
              >
                {t('auth.tabSignIn')}
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === 'signup' ? 'auth-tab--active' : ''}`}
                onClick={() => handleTabChange('signup')}
                role="tab"
                aria-selected={mode === 'signup'}
              >
                {t('auth.tabCreateAccount')}
              </button>
            </div>
          )}

          {/* Alerts */}
          {!isConfigured && (
            <div className="auth-alert auth-alert--warning" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Notice:</strong> {t('auth.demoNotice')}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="auth-alert auth-alert--danger" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert auth-alert--success" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>{successMessage}</div>
            </div>
          )}

          {/* ── 1. LOGIN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  {t('auth.emailLabel')} <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    id="login-email"
                    type="email"
                    className="form-control"
                    placeholder={t('auth.phEmail')}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="auth-label-row">
                  <label className="form-label" htmlFor="login-password">
                    {t('auth.passwordLabel')} <span className="required">*</span>
                  </label>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => handleTabChange('forgot')}
                  >
                    {t('auth.forgotPasswordLink')}
                  </button>
                </div>
                <div className="input-with-icon">
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder={t('auth.phPassword')}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={loading}
              >
                {loading ? <LoadingSpinner label={t('auth.authenticating')} /> : t('auth.signInBtn')}
              </button>
            </form>
          )}

          {/* ── 2. SIGNUP FORM ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="auth-form" noValidate>
              {/* Account Type Selector */}
              <div className="form-group">
                <label className="form-label">
                  {t('auth.accountType')} <span className="required">*</span>
                </label>
                <div className="role-selector-grid">
                  <button
                    type="button"
                    className={`role-card ${signupForm.role === 'farmer' ? 'role-card--active' : ''}`}
                    onClick={() => setSignupForm((prev) => ({ ...prev, role: 'farmer' }))}
                  >
                    <div className="role-card__icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 20h10M12 20V10M12 10C9 10 5 8 5 4c4 0 7 2 7 6zm0 0c3 0 7-2 7-6-4 0-7 2-7 6z" />
                      </svg>
                    </div>
                    <div className="role-card__content">
                      <div className="role-card__title">{t('auth.farmerRoleTitle')}</div>
                      <div className="role-card__desc">
                        {t('auth.farmerRoleDesc')}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`role-card ${signupForm.role === 'buyer' ? 'role-card--active' : ''}`}
                    onClick={() => setSignupForm((prev) => ({ ...prev, role: 'buyer' }))}
                  >
                    <div className="role-card__icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </div>
                    <div className="role-card__content">
                      <div className="role-card__title">{t('auth.buyerRoleTitle')}</div>
                      <div className="role-card__desc">
                        {t('auth.buyerRoleDesc')}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Personal Details */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-name">
                    {t('auth.fullName')} <span className="required">*</span>
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    className="form-control"
                    placeholder={t('auth.phFullName')}
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-email">
                    {t('auth.emailLabel')} <span className="required">*</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    className="form-control"
                    placeholder={t('auth.phSignupEmail')}
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-password">
                    {t('auth.passwordLabel')} <span className="required">*</span>
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    className="form-control"
                    placeholder={t('auth.phSignupPassword')}
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-confirm-password">
                    {t('auth.confirmPassword')} <span className="required">*</span>
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    className="form-control"
                    placeholder={t('auth.phConfirmPassword')}
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Profile Details (Location & Phone) */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-phone">
                    {t('auth.phoneOptional')}
                  </label>
                  <input
                    id="signup-phone"
                    type="tel"
                    className="form-control"
                    placeholder="+91 98765 43210"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-state">
                    {t('auth.stateOptional')}
                  </label>
                  <select
                    id="signup-state"
                    className="form-control"
                    value={signupForm.state}
                    onChange={(e) => setSignupForm({ ...signupForm, state: e.target.value })}
                  >
                    <option value="">{t('profile.state')}</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-district">
                    {t('auth.districtOptional')}
                  </label>
                  <input
                    id="signup-district"
                    type="text"
                    className="form-control"
                    placeholder={t('auth.phDistrict')}
                    value={signupForm.district}
                    onChange={(e) => setSignupForm({ ...signupForm, district: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-location">
                    {t('auth.locationOptional')}
                  </label>
                  <input
                    id="signup-location"
                    type="text"
                    className="form-control"
                    placeholder={t('auth.phLocation')}
                    value={signupForm.location}
                    onChange={(e) => setSignupForm({ ...signupForm, location: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={loading}
              >
                {loading ? <LoadingSpinner label={t('auth.creatingAccount')} /> : t('auth.completeRegistration')}
              </button>
            </form>
          )}

          {/* ── 3. FORGOT PASSWORD FORM ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="auth-form" noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">
                  {t('auth.registeredEmail')} <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    id="forgot-email"
                    type="email"
                    className="form-control"
                    placeholder={t('auth.phSignupEmail')}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={loading}
              >
                {loading ? <LoadingSpinner label={t('auth.sendingInstructions')} /> : t('auth.sendRecovery')}
              </button>

              <div className="auth-back-link">
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => handleTabChange('login')}
                >
                  {t('auth.returnToSignIn')}
                </button>
              </div>
            </form>
          )}

          {/* Footer note */}
          <div className="auth-card__footer">
            <p className="auth-footer-text">
              {t('auth.footerNotice')}
            </p>
            <div className="auth-footer-links">
              <Link to="/farmer">{t('auth.farmerPortal')}</Link>
              <span>•</span>
              <Link to="/buyer">{t('auth.buyerRequirements')}</Link>
              <span>•</span>
              <Link to="/matches">{t('auth.liveMarketplace')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
