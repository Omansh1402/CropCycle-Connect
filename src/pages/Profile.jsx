import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/useAuth';
import { fetchUserListings, fetchUserBuyerDemands } from '../lib/db';
import { LoadingSpinner } from '../components/DbStatus';
import './Profile.css';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
];

function getInitials(name) {
  if (!name) return 'CC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(isoString) {
  if (!isoString) return 'Active Member';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Active Member';
  }
}

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut, loading: authLoading } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Edit form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    role: 'farmer',
    location: '',
    district: '',
    state: '',
    avatarUrl: '',
  });

  // User-associated records (fetched dynamically if Supabase has user_id support)
  const [userListings, setUserListings] = useState([]);
  const [userDemands, setUserDemands] = useState([]);

  // Populate form data whenever profile changes
  useEffect(() => {
    if (!profile) return;
    const timer = setTimeout(() => {
      setFormData({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        role: profile.role || 'farmer',
        location: profile.location || '',
        district: profile.district || '',
        state: profile.state || '',
        avatarUrl: profile.avatar_url || '',
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [profile]);

  // Fetch user's registered activity
  useEffect(() => {
    if (!user?.id) return;
    let isCurrent = true;
    Promise.all([
      fetchUserListings(user.id),
      fetchUserBuyerDemands(user.id),
    ])
      .then(([listingsRes, demandsRes]) => {
        if (!isCurrent) return;
        if (listingsRes?.data) setUserListings(listingsRes.data);
        if (demandsRes?.data) setUserDemands(demandsRes.data);
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [user]);

  // Handle Logout
  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      setErrorMessage(t('profile.errNameMin'));
      return;
    }

    if (formData.phone && !/^[0-9+\s()-]{7,15}$/.test(formData.phone.trim())) {
      setErrorMessage(t('profile.errPhoneInvalid'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await updateProfile(formData);
      if (error) {
        setErrorMessage(error.message || t('farmer.errUnexpected', 'Failed to update profile. Please try again.'));
        return;
      }

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch {
      setErrorMessage(t('farmer.errUnexpected', 'An unexpected error occurred while saving.'));
    } finally {
      setSaving(false);
    }
  };

  // If loading session
  if (authLoading) {
    return (
      <div className="profile-loading-state">
        <LoadingSpinner label={t('profile.loading')} />
      </div>
    );
  }

  // If user is not authenticated
  if (!user) {
    return (
      <div className="profile-page">
        <div className="container-narrow">
          <div className="profile-gate-card">
            <div className="profile-gate-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="profile-gate-title">{t('profile.gateTitle')}</h1>
            <p className="profile-gate-desc">
              {t('profile.gateDesc')}
            </p>
            <div className="profile-gate-actions">
              <Link to="/login?redirect=/profile" className="btn btn-primary btn-lg">
                {t('profile.signIn')}
              </Link>
              <Link to="/login?mode=signup&redirect=/profile" className="btn btn-secondary btn-lg">
                {t('profile.createAccount')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roleLabel = (profile?.role || 'farmer') === 'buyer'
    ? t('profile.buyerOption')
    : t('profile.farmerOption');

  const initials = getInitials(profile?.full_name || user.email);

  return (
    <div className="profile-page">
      <div className="container-narrow">
        {/* Success Alert */}
        {saveSuccess && (
          <div className="profile-alert profile-alert--success" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{t('profile.savedSuccess')}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="profile-alert profile-alert--danger" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── Main Profile Header Card ── */}
        <div className="profile-card profile-card--header">
          <div className="profile-header-main">
            {/* Avatar */}
            <div className="profile-avatar-container">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || t('profile.memberAccount')}
                  className="profile-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('d-none');
                  }}
                />
              ) : null}
              <div
                className={`profile-avatar-initials ${profile?.avatar_url ? 'd-none' : ''}`}
                aria-hidden="true"
              >
                {initials}
              </div>
            </div>

            {/* Identity info */}
            <div className="profile-header-text">
              <div className="profile-role-badge-row">
                <span
                  className={`badge ${
                    (profile?.role || 'farmer') === 'buyer' ? 'badge-blue' : 'badge-green'
                  }`}
                >
                  {roleLabel}
                </span>
                <span className="profile-creation-date">
                  {t('profile.memberSince', { date: formatDate(profile?.created_at || user.created_at) })}
                </span>
              </div>

              <h1 className="profile-user-name">
                {profile?.full_name || t('profile.memberAccount')}
              </h1>
              <div className="profile-user-email">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>{user.email}</span>
                {user.email_confirmed_at && (
                  <span className="verified-pill">{t('profile.verified')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="profile-header-actions">
            {!isEditing ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsEditing(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>{t('profile.editProfile')}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsEditing(false);
                  setErrorMessage(null);
                }}
              >
                {t('profile.cancel')}
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline btn-sm btn-logout"
              onClick={handleLogout}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{t('profile.logout')}</span>
            </button>
          </div>
        </div>

        {/* ── View Mode: Profile Details Grid ── */}
        {!isEditing && (
          <div className="profile-card profile-details-card">
            <h2 className="profile-section-title">{t('profile.accountDetails')}</h2>
            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span className="detail-label">{t('profile.fullName')}</span>
                <span className="detail-value">{profile?.full_name || '—'}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">{t('profile.accountRole')}</span>
                <span className="detail-value">{roleLabel}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">{t('profile.emailAddress')}</span>
                <span className="detail-value">{user.email}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">{t('profile.phoneNumber')}</span>
                <span className="detail-value">{profile?.phone || t('profile.notProvided')}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">{t('profile.villageFacility')}</span>
                <span className="detail-value">{profile?.location || t('profile.notProvided')}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">{t('profile.district')}</span>
                <span className="detail-value">{profile?.district || t('profile.notProvided')}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">{t('profile.state')}</span>
                <span className="detail-value">{profile?.state || t('profile.notSpecified')}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">{t('profile.accountId')}</span>
                <span className="detail-value detail-value--mono">{user.id}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Mode: Profile Form ── */}
        {isEditing && (
          <div className="profile-card profile-edit-card">
            <h2 className="profile-section-title">{t('profile.editProfileTitle')}</h2>
            <form onSubmit={handleSave} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-fullname">
                    {t('profile.fullName')} <span className="required">*</span>
                  </label>
                  <input
                    id="edit-fullname"
                    type="text"
                    name="fullName"
                    className="form-control"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-role">
                    {t('profile.accountType')} <span className="required">*</span>
                  </label>
                  <select
                    id="edit-role"
                    name="role"
                    className="form-control"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="farmer">{t('profile.farmerOption')}</option>
                    <option value="buyer">{t('profile.buyerOption')}</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-phone">
                    {t('profile.phoneNumber')}
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    name="phone"
                    className="form-control"
                    placeholder={t('profile.phPhone')}
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-state">
                    {t('profile.state')}
                  </label>
                  <select
                    id="edit-state"
                    name="state"
                    className="form-control"
                    value={formData.state}
                    onChange={handleChange}
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
                  <label className="form-label" htmlFor="edit-district">
                    {t('profile.district')}
                  </label>
                  <input
                    id="edit-district"
                    type="text"
                    name="district"
                    className="form-control"
                    placeholder={t('profile.phDistrict')}
                    value={formData.district}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-location">
                    {t('profile.villageFacility')}
                  </label>
                  <input
                    id="edit-location"
                    type="text"
                    name="location"
                    className="form-control"
                    placeholder={t('profile.phLocation')}
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-avatar">
                  {t('profile.avatarUrl')}
                </label>
                <input
                  id="edit-avatar"
                  type="url"
                  name="avatarUrl"
                  className="form-control"
                  placeholder={t('profile.phAvatar')}
                  value={formData.avatarUrl}
                  onChange={handleChange}
                />
                <span className="form-hint">
                  {t('profile.avatarHint')}
                </span>
              </div>

              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={saving}
                >
                  {saving ? <LoadingSpinner label={t('profile.savingChanges')} /> : t('profile.saveChanges')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  {t('profile.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Quick Access & Connected Activity Section ── */}
        <div className="profile-activity-section">
          <div className="profile-card profile-shortcuts-card">
            <h2 className="profile-section-title">{t('profile.shortcutsTitle')}</h2>
            <div className="shortcuts-grid">
              <Link to="/farmer" className="shortcut-card">
                <div className="shortcut-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <div className="shortcut-title">{t('profile.shortcutListResidue')}</div>
                <div className="shortcut-desc">{t('profile.shortcutListResidueDesc')}</div>
              </Link>

              <Link to="/buyer" className="shortcut-card">
                <div className="shortcut-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <div className="shortcut-title">{t('profile.shortcutRegisterDemand')}</div>
                <div className="shortcut-desc">{t('profile.shortcutRegisterDemandDesc')}</div>
              </Link>

              <Link to="/matches" className="shortcut-card">
                <div className="shortcut-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div className="shortcut-title">{t('profile.shortcutMarketplace')}</div>
                <div className="shortcut-desc">{t('profile.shortcutMarketplaceDesc')}</div>
              </Link>

              <Link to="/dashboard" className="shortcut-card">
                <div className="shortcut-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <div className="shortcut-title">{t('profile.shortcutDashboard')}</div>
                <div className="shortcut-desc">{t('profile.shortcutDashboardDesc')}</div>
              </Link>
            </div>
          </div>

          {/* User's Created Listings (if any) */}
          {userListings.length > 0 && (
            <div className="profile-card profile-user-records">
              <h2 className="profile-section-title">{t('profile.myListingsTitle', { count: userListings.length })}</h2>
              <div className="user-records-list">
                {userListings.map((item) => (
                  <div key={item.id} className="user-record-row">
                    <div>
                      <div className="record-primary-text">{t(`crops.${item.residue_type}`, item.residue_type)}</div>
                      <div className="record-secondary-text">
                        {t('profile.tonnesLot', { tonnes: item.quantity_tonnes, location: `${item.location}, ${item.state}` })}
                      </div>
                    </div>
                    <span className="badge badge-green">{t(`common.${item.status || 'active'}`, item.status || 'active')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User's Created Demands (if any) */}
          {userDemands.length > 0 && (
            <div className="profile-card profile-user-records">
              <h2 className="profile-section-title">{t('profile.myDemandsTitle', { count: userDemands.length })}</h2>
              <div className="user-records-list">
                {userDemands.map((item) => (
                  <div key={item.id} className="user-record-row">
                    <div>
                      <div className="record-primary-text">{item.org_name}</div>
                      <div className="record-secondary-text">
                        {t('profile.tonnesReq', { tonnes: item.required_quantity_tonnes, location: `${item.location}, ${item.state}` })}
                      </div>
                    </div>
                    <span className="badge badge-blue">{item.availability_status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
