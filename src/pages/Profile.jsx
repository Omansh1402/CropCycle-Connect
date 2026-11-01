// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import './Profile.css';

const STORAGE_KEY = 'cropcycle_user_profile';

const DEFAULT_PROFILE = {
  fullName: 'Rajinder Singh',
  email: 'rajinder.singh@cropcycle.demo',
  phone: '9876543210',
  accountType: 'Farmer', // 'Farmer' | 'Buyer'
  state: 'Punjab',
  district: 'Ludhiana',
  location: 'Village Jagraon, GT Road Mandi',
  createdAt: '2024-10-15T00:00:00.000Z',
};

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMemberDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function Profile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_PROFILE);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load profile from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          const merged = { ...DEFAULT_PROFILE, ...parsed };
          setProfile(merged);
          setFormData(merged);
          return;
        }
      }
    } catch {
      // Local storage unavailable or corrupt; use default
    }
    setProfile(DEFAULT_PROFILE);
    setFormData(DEFAULT_PROFILE);
  }, []);

  const validate = () => {
    const errs = {};
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      errs.fullName = t('errFullName');
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = t('errEmailValidation');
    }

    if (!formData.phone || !/^[0-9+\s()-]{7,15}$/.test(formData.phone.trim())) {
      errs.phone = t('errPhoneValidation');
    }

    if (!formData.accountType || !['Farmer', 'Buyer'].includes(formData.accountType)) {
      errs.accountType = t('errAccountType');
    }

    if (!formData.state || formData.state.trim().length === 0) {
      errs.state = t('errState');
    }

    if (!formData.district || formData.district.trim().length === 0) {
      errs.district = t('errDistrict');
    }

    if (!formData.location || formData.location.trim().length === 0) {
      errs.location = t('errLocationReq');
    }

    return errs;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleStartEdit = () => {
    setFormData(profile);
    setErrors({});
    setSuccessMessage('');
    setErrorMessage('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(profile);
    setErrors({});
    setErrorMessage('');
    setIsEditing(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setErrorMessage(t('profileValidationPrompt'));
      return;
    }

    const updated = {
      ...formData,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      state: formData.state.trim(),
      district: formData.district.trim(),
      location: formData.location.trim(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setProfile(updated);
      setIsEditing(false);
      setSuccessMessage(t('profileSavedSuccess'));
    } catch {
      setErrorMessage(t('profileSaveError'));
    }
  };

  const initials = getInitials(profile.fullName);
  const memberDate = formatMemberDate(profile.createdAt);
  const isFarmer = (isEditing ? formData.accountType : profile.accountType) === 'Farmer';

  return (
    <main className="profile-page" id="main-content">
      <div className="container profile-container">
        {/* Transparent Storage Limitation Banner */}
        <section className="profile-notice" aria-label="Demo notice">
          <div className="profile-notice__icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="10" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div className="profile-notice__content">
            <h2 className="profile-notice__title">{t('localDemoProfile')}</h2>
            <p className="profile-notice__text">
              {t('localDemoProfileNotice')}
            </p>
          </div>
        </section>

        {/* Success Alert */}
        {successMessage && (
          <div className="profile-alert profile-alert--success" role="status" aria-live="polite">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="profile-alert profile-alert--error" role="alert">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Header Summary */}
        <header className="profile-header-card">
          <div className="profile-header-main">
            <div
              className={`profile-avatar ${!isFarmer ? 'profile-avatar--buyer' : ''}`}
              aria-label={`Initials: ${initials}`}
            >
              {initials}
            </div>
            <div className="profile-identity">
              <h1 className="profile-name">{profile.fullName}</h1>
              <div className="profile-meta-row">
                <span
                  className={`profile-badge ${
                    profile.accountType === 'Farmer' ? 'profile-badge--farmer' : 'profile-badge--buyer'
                  }`}
                >
                  {profile.accountType === 'Farmer' ? t('farmerProducerOption') : t('buyerConsumerOption')}
                </span>
                {memberDate && (
                  <span className="profile-member-date">{t('memberSince')} {memberDate}</span>
                )}
              </div>
            </div>
          </div>

          {!isEditing && (
            <div className="profile-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartEdit}
                aria-label="Edit Profile"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: '6px' }}
                  aria-hidden="true"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {t('editProfile')}
              </button>
            </div>
          )}
        </header>

        {/* Details / Edit Form Sections */}
        {isEditing ? (
          <form className="profile-card profile-edit-form" onSubmit={handleSave} noValidate>
            <div className="profile-card__header">
              <h2 className="profile-card__title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {t('editProfileDetails')}
              </h2>
            </div>

            <div className="profile-card__body">
              <div className="profile-form-grid">
                {/* Full Name */}
                <div className="profile-form-group">
                  <label htmlFor="field-fullName" className="profile-form-label">
                    {t('fullName')} <span className="req">*</span>
                  </label>
                  <input
                    id="field-fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`profile-form-input ${
                      errors.fullName ? 'profile-form-input--error' : ''
                    }`}
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? 'err-fullName' : undefined}
                    placeholder="e.g. Rajinder Singh"
                    required
                  />
                  {errors.fullName && (
                    <span id="err-fullName" className="profile-form-error" role="alert">
                      {errors.fullName}
                    </span>
                  )}
                </div>

                {/* Account Type */}
                <div className="profile-form-group">
                  <label htmlFor="field-accountType" className="profile-form-label">
                    {t('accountType')} <span className="req">*</span>
                  </label>
                  <select
                    id="field-accountType"
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleInputChange}
                    className={`profile-form-select ${
                      errors.accountType ? 'profile-form-select--error' : ''
                    }`}
                    aria-invalid={Boolean(errors.accountType)}
                    aria-describedby={errors.accountType ? 'err-accountType' : undefined}
                  >
                    <option value="Farmer">{t('farmerProducerOption')}</option>
                    <option value="Buyer">{t('buyerConsumerOption')}</option>
                  </select>
                  {errors.accountType && (
                    <span id="err-accountType" className="profile-form-error" role="alert">
                      {errors.accountType}
                    </span>
                  )}
                </div>

                {/* Email Address */}
                <div className="profile-form-group">
                  <label htmlFor="field-email" className="profile-form-label">
                    {t('emailAddress')} <span className="req">*</span>
                  </label>
                  <input
                    id="field-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`profile-form-input ${
                      errors.email ? 'profile-form-input--error' : ''
                    }`}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'err-email' : undefined}
                    placeholder="name@domain.com"
                    required
                  />
                  {errors.email && (
                    <span id="err-email" className="profile-form-error" role="alert">
                      {errors.email}
                    </span>
                  )}
                </div>

                {/* Phone Number */}
                <div className="profile-form-group">
                  <label htmlFor="field-phone" className="profile-form-label">
                    {t('phoneNumber')} <span className="req">*</span>
                  </label>
                  <input
                    id="field-phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`profile-form-input ${
                      errors.phone ? 'profile-form-input--error' : ''
                    }`}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'err-phone' : undefined}
                    placeholder="e.g. 9876543210"
                    required
                  />
                  {errors.phone && (
                    <span id="err-phone" className="profile-form-error" role="alert">
                      {errors.phone}
                    </span>
                  )}
                </div>

                {/* State */}
                <div className="profile-form-group">
                  <label htmlFor="field-state" className="profile-form-label">
                    {t('stateLabel')} <span className="req">*</span>
                  </label>
                  <input
                    id="field-state"
                    name="state"
                    type="text"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={`profile-form-input ${
                      errors.state ? 'profile-form-input--error' : ''
                    }`}
                    aria-invalid={Boolean(errors.state)}
                    aria-describedby={errors.state ? 'err-state' : undefined}
                    placeholder="e.g. Punjab"
                    required
                  />
                  {errors.state && (
                    <span id="err-state" className="profile-form-error" role="alert">
                      {errors.state}
                    </span>
                  )}
                </div>

                {/* District */}
                <div className="profile-form-group">
                  <label htmlFor="field-district" className="profile-form-label">
                    {t('districtLabel')} <span className="req">*</span>
                  </label>
                  <input
                    id="field-district"
                    name="district"
                    type="text"
                    value={formData.district}
                    onChange={handleInputChange}
                    className={`profile-form-input ${
                      errors.district ? 'profile-form-input--error' : ''
                    }`}
                    aria-invalid={Boolean(errors.district)}
                    aria-describedby={errors.district ? 'err-district' : undefined}
                    placeholder="e.g. Ludhiana"
                    required
                  />
                  {errors.district && (
                    <span id="err-district" className="profile-form-error" role="alert">
                      {errors.district}
                    </span>
                  )}
                </div>

                {/* Location */}
                <div className="profile-form-group profile-form-grid--full">
                  <label htmlFor="field-location" className="profile-form-label">
                    {t('specificLocationAddress')} <span className="req">*</span>
                  </label>
                  <input
                    id="field-location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleInputChange}
                    className={`profile-form-input ${
                      errors.location ? 'profile-form-input--error' : ''
                    }`}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={errors.location ? 'err-location' : undefined}
                    placeholder="e.g. Village Jagraon, GT Road Mandi"
                    required
                  />
                  {errors.location && (
                    <span id="err-location" className="profile-form-error" role="alert">
                      {errors.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="profile-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {t('saveChanges')}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="profile-sections">
            {/* Account Information Card */}
            <section className="profile-card" aria-labelledby="card-account-info">
              <div className="profile-card__header">
                <h2 id="card-account-info" className="profile-card__title">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {t('accountInformation')}
                </h2>
              </div>
              <div className="profile-card__body">
                <div className="profile-grid">
                  <div className="profile-field">
                    <span className="profile-field__label">{t('fullName')}</span>
                    <span className="profile-field__value">{profile.fullName}</span>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field__label">{t('accountRole')}</span>
                    <span className="profile-field__value">{profile.accountType}</span>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field__label">{t('emailAddress')}</span>
                    <span className="profile-field__value">{profile.email}</span>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field__label">{t('phoneNumber')}</span>
                    <span className="profile-field__value">{profile.phone}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Geographic & Operating Location Card */}
            <section className="profile-card" aria-labelledby="card-location-info">
              <div className="profile-card__header">
                <h2 id="card-location-info" className="profile-card__title">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {t('operatingLocation')}
                </h2>
              </div>
              <div className="profile-card__body">
                <div className="profile-grid">
                  <div className="profile-field">
                    <span className="profile-field__label">{t('stateLabel')}</span>
                    <span className="profile-field__value">{profile.state}</span>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field__label">{t('districtLabel')}</span>
                    <span className="profile-field__value">{profile.district}</span>
                  </div>

                  <div className="profile-field profile-grid--full">
                    <span className="profile-field__label">{t('specificLocationAddress')}</span>
                    <span className="profile-field__value">{profile.location}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* System Security & Storage Metadata */}
            <section className="profile-card" aria-labelledby="card-security-info">
              <div className="profile-card__header">
                <h2 id="card-security-info" className="profile-card__title">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Storage & Authentication Status
                </h2>
              </div>
              <div className="profile-card__body">
                <div className="profile-grid">
                  <div className="profile-field">
                    <span className="profile-field__label">{t('dataPersistenceMode')}</span>
                    <span className="profile-field__value">{t('clientSideStorage')}</span>
                  </div>

                  {memberDate && (
                    <div className="profile-field">
                      <span className="profile-field__label">{t('accountCreated')}</span>
                      <span className="profile-field__value">{memberDate}</span>
                    </div>
                  )}

                  <div className="profile-field profile-grid--full">
                    <span className="profile-field__label">{t('securityArchNote')}</span>
                    <span className="profile-field__value" style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                      {t('securityArchSandboxDesc')}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
