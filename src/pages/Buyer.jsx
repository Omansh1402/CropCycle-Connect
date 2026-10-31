// src/pages/Buyer.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RESIDUE_TYPES, INTENDED_USES } from '../data/sampleData';
import { createBuyerRequirement, formatDbError } from '../lib/db';
import { isConfigured } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { DbSetupBanner, DbErrorAlert, LoadingSpinner } from '../components/DbStatus';
import SplitText from '../components/reactbits/SplitText';
import FadeContent from '../components/reactbits/FadeContent';
import './Buyer.css';

const INITIAL_FORM = {
  orgName: '',
  orgType: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  acceptedTypes: [],
  requiredQuantity: '',
  maxIntake: '',
  location: '',
  state: '',
  intendedUse: '',
  available: 'yes',
  notes: '',
};

const ORG_TYPES = [
  'Private Company',
  'Cooperative Society',
  'Government Body',
  'NGO / Trust',
  'Research Institution',
  'Individual / Farm',
];

export default function Buyer() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Pre-fill profile info if logged in and form is untouched
  useEffect(() => {
    if (!user && !profile) return;
    const timer = setTimeout(() => {
      setForm((prev) => ({
        ...prev,
        orgName: prev.orgName || profile?.full_name || '',
        contactPerson: prev.contactPerson || profile?.full_name || '',
        contactEmail: prev.contactEmail || user?.email || '',
        contactPhone: prev.contactPhone || profile?.phone || '',
        location: prev.location || profile?.location || '',
        state: prev.state || profile?.state || '',
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, [user, profile]);

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.orgName.trim())
      e.orgName = t('buyer.errOrgName');
    if (form.acceptedTypes.length === 0)
      e.acceptedTypes = t('buyer.errTypes');
    if (!form.requiredQuantity || Number(form.requiredQuantity) <= 0)
      e.requiredQuantity = t('buyer.errQty');
    if (form.maxIntake && Number(form.maxIntake) < Number(form.requiredQuantity))
      e.maxIntake = t('buyer.errMaxIntake');
    if (!form.location.trim())
      e.location = t('buyer.errLocation');
    if (!form.state.trim())
      e.state = t('buyer.errState');
    if (!form.intendedUse)
      e.intendedUse = t('buyer.errUse');
    if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail))
      e.contactEmail = t('buyer.errEmail');
    if (form.contactPhone && !/^[0-9+\s()-]{7,15}$/.test(form.contactPhone.trim()))
      e.contactPhone = t('buyer.errPhone');
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (dbError) setDbError(null);
  };

  const toggleResidueType = (type) => {
    setForm((prev) => {
      const has = prev.acceptedTypes.includes(type);
      return {
        ...prev,
        acceptedTypes: has
          ? prev.acceptedTypes.filter((tVal) => tVal !== type)
          : [...prev.acceptedTypes, type],
      };
    });
    if (errors.acceptedTypes) setErrors((prev) => ({ ...prev, acceptedTypes: undefined }));
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setDbError(null);

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstErrId = Object.keys(errs)[0];
      document.getElementById(firstErrId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await createBuyerRequirement(form, user?.id);

      if (error) {
        if (error.code === 'NOT_CONFIGURED') {
          setSavedRecord(null);
          setSubmitted(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        setDbError(formatDbError(error));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSavedRecord(data);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setDbError(t('farmer.errUnexpected', 'An unexpected error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setSubmitted(false);
    setSavedRecord(null);
    setErrors({});
    setDbError(null);
  };

  // ── Success state ─────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="buyer-page">
        <header className="page-header">
          <div className="container">
            <span className="section-eyebrow">{t('buyer.eyebrow')}</span>
            <SplitText
              key={`buyer-success-${i18n.language}`}
              text={t('buyer.successTitle')}
              tag="h1"
              className="display-lg"
              delay={0.03}
            />
            <p className="body-md text-muted mt-xs">
              {t('buyer.successSubtitle')}
            </p>
          </div>
        </header>

        <div className="container section-sm">
          <FadeContent delay={0.1} distance={20} className="buyer-success reveal is-visible">
            <div className="success-banner-box">
              <div className="success-badge">
                <span className="success-dot" />
                <span>{t('buyer.registeredBadge')}</span>
              </div>
              <h2 className="heading-lg mt-xs">
                {savedRecord ? t('buyer.dbCommitted') : t('buyer.localStored')}
              </h2>
              <p className="body-md text-muted mt-xs">
                {savedRecord
                  ? <>{t('buyer.refIdPrefix')}<code className="record-id">{savedRecord.id}</code>{t('buyer.refIdSuffix')}</>
                  : t('buyer.localNotice', { location: form.location })}
              </p>
            </div>

            <div className="buyer-success__summary card">
              <div className="summary-header">
                <h3 className="heading-md">{t('buyer.profileSummary')}</h3>
                <span className="badge badge-green">{t('buyer.intakeActive')}</span>
              </div>
              <div className="spec-table-grid">
                <div className="spec-item">
                  <span className="label">{t('buyer.lblEnterprise')}</span>
                  <div className="spec-val font-semibold">{form.orgName}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('buyer.lblFacilityLocation')}</span>
                  <div className="spec-val">{form.location}, {form.state}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('buyer.lblTargetBatch')}</span>
                  <div className="spec-val font-semibold text-forest">
                    {form.requiredQuantity} {t('common.tonnes', 'tonnes')}
                  </div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('buyer.lblYardLimit')}</span>
                  <div className="spec-val">
                    {form.maxIntake ? `${form.maxIntake} ${t('common.tonnes', 'tonnes')}` : t('buyer.flexibleCapacity')}
                  </div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('buyer.lblTransformation')}</span>
                  <div className="spec-val">
                    {form.intendedUse ? t(`uses.${form.intendedUse}`, form.intendedUse) : '—'}
                  </div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('buyer.lblIntakeAvailability')}</span>
                  <div className="spec-val">
                    {form.available === 'yes' ? t('buyer.acceptingSupply')
                     : form.available === 'limited' ? t('buyer.limitedCapacity')
                     : t('buyer.intakeStandby')}
                  </div>
                </div>
              </div>

              <div className="mt-lg pt-md" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <span className="label">{t('buyer.lblAcceptedSpecies')}</span>
                <div className="tag-list mt-xs">
                  {form.acceptedTypes.map((cropKey) => (
                    <span key={cropKey} className="badge badge-green">
                      {t(`crops.${cropKey}`, cropKey)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="buyer-success__actions">
              <button onClick={() => navigate('/matches')} className="btn btn-primary btn-lg">
                {t('buyer.btnInspectSupply')}
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-lg">
                {t('buyer.btnViewDashboard')}
              </button>
              <button onClick={handleReset} className="btn btn-outline">
                {t('buyer.btnRegisterAdditional')}
              </button>
            </div>
          </FadeContent>
        </div>
      </main>
    );
  }

  // ── Main form ─────────────────────────────────────────────────
  return (
    <main className="buyer-page">
      <header className="page-header">
        <div className="container">
          <div className="page-header__inner">
            <span className="section-eyebrow">{t('buyer.eyebrow')}</span>
            <SplitText
              key={`buyer-heading-${i18n.language}`}
              text={t('buyer.title')}
              tag="h1"
              className="display-lg"
              delay={0.03}
            />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '600px' }}>
              {t('buyer.subtitle')}
            </p>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        <div className="buyer-layout">
          <FadeContent delay={0.1} distance={20} className="buyer-form-wrap">
            {!isConfigured && <DbSetupBanner />}
            {dbError && <DbErrorAlert message={dbError} onRetry={() => setDbError(null)} />}

            <form onSubmit={handleSubmit} noValidate aria-label={t('buyer.title')}>
              {/* ── Section 01: Enterprise Details ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">{t('buyer.sec1Num')}</span>
                  <div>
                    <h2 className="heading-md">{t('buyer.sec1Title')}</h2>
                    <p className="body-sm text-muted">{t('buyer.sec1Desc')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="orgName">
                      {t('buyer.lblOrgName')} <span className="required">*</span>
                    </label>
                    <input
                      id="orgName"
                      name="orgName"
                      type="text"
                      className={`form-control ${errors.orgName ? 'form-control--error' : ''}`}
                      placeholder={t('buyer.phOrgName')}
                      value={form.orgName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.orgName && <span className="form-error" role="alert">{errors.orgName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="orgType">{t('buyer.lblOrgType')}</label>
                    <select
                      id="orgType"
                      name="orgType"
                      className="form-control"
                      value={form.orgType}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— {t('buyer.lblOrgType')} —</option>
                      {ORG_TYPES.map((orgKey) => (
                        <option key={orgKey} value={orgKey}>
                          {t(`orgTypes.${orgKey}`, orgKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPerson">{t('buyer.lblProcurementOfficer')}</label>
                    <input
                      id="contactPerson"
                      name="contactPerson"
                      type="text"
                      className="form-control"
                      placeholder={t('buyer.phProcurementOfficer')}
                      value={form.contactPerson}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPhone">{t('buyer.lblContactPhone')}</label>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      className={`form-control ${errors.contactPhone ? 'form-control--error' : ''}`}
                      placeholder={t('buyer.phContactPhone')}
                      value={form.contactPhone}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={20}
                    />
                    {errors.contactPhone && <span className="form-error" role="alert">{errors.contactPhone}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactEmail">{t('buyer.lblOfficialEmail')}</label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder={t('buyer.phOfficialEmail')}
                      value={form.contactEmail}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.contactEmail && <span className="form-error" role="alert">{errors.contactEmail}</span>}
                  </div>
                </div>
              </div>

              {/* ── Section 02: Residue Species ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">{t('buyer.sec2Num')}</span>
                  <div>
                    <h2 className="heading-md">{t('buyer.sec2Title')}</h2>
                    <p className="body-sm text-muted">{t('buyer.sec2Desc')}</p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t('buyer.lblResidueTypes')} <span className="required">*</span>
                  </label>
                  <div className="residue-type-grid" role="group" aria-label={t('buyer.lblResidueTypes')}>
                    {RESIDUE_TYPES.map((type) => {
                      const selected = form.acceptedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          className={`residue-type-btn ${selected ? 'active' : ''}`}
                          onClick={() => toggleResidueType(type)}
                          aria-pressed={selected}
                        >
                          {selected && <span className="btn-check">✓ </span>}
                          {t(`crops.${type}`, type)}
                        </button>
                      );
                    })}
                  </div>
                  {errors.acceptedTypes && (
                    <span className="form-error mt-xs" role="alert">{errors.acceptedTypes}</span>
                  )}
                  <span className="form-hint mt-xs">
                    {t('buyer.hintSelectedTypes', { count: form.acceptedTypes.length })}
                  </span>
                </div>
              </div>

              {/* ── Section 03: Intake Capacities & Transformation ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">{t('buyer.sec3Num')}</span>
                  <div>
                    <h2 className="heading-md">{t('buyer.sec3Title')}</h2>
                    <p className="body-sm text-muted">{t('buyer.sec3Desc')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="requiredQuantity">
                      {t('buyer.lblMinBatch')} <span className="required">*</span>
                    </label>
                    <input
                      id="requiredQuantity"
                      name="requiredQuantity"
                      type="number"
                      min="1"
                      className={`form-control ${errors.requiredQuantity ? 'form-control--error' : ''}`}
                      placeholder={t('buyer.phMinBatch')}
                      value={form.requiredQuantity}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.requiredQuantity && <span className="form-error" role="alert">{errors.requiredQuantity}</span>}
                    <span className="form-hint">{t('buyer.hintMinBatch')}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="maxIntake">
                      {t('buyer.lblMaxIntake')}
                    </label>
                    <input
                      id="maxIntake"
                      name="maxIntake"
                      type="number"
                      min="1"
                      className={`form-control ${errors.maxIntake ? 'form-control--error' : ''}`}
                      placeholder={t('buyer.phMaxIntake')}
                      value={form.maxIntake}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.maxIntake && <span className="form-error" role="alert">{errors.maxIntake}</span>}
                    <span className="form-hint">{t('buyer.hintMaxIntake')}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="intendedUse">
                      {t('buyer.lblIntendedUse')} <span className="required">*</span>
                    </label>
                    <select
                      id="intendedUse"
                      name="intendedUse"
                      className={`form-control ${errors.intendedUse ? 'form-control--error' : ''}`}
                      value={form.intendedUse}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— {t('buyer.lblIntendedUse')} —</option>
                      {INTENDED_USES.map((useKey) => (
                        <option key={useKey} value={useKey}>
                          {t(`uses.${useKey}`, useKey)}
                        </option>
                      ))}
                    </select>
                    {errors.intendedUse && <span className="form-error" role="alert">{errors.intendedUse}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="available">{t('buyer.lblIntakeStatus')}</label>
                    <select
                      id="available"
                      name="available"
                      className="form-control"
                      value={form.available}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="yes">{t('buyer.optActiveDeliveries')}</option>
                      <option value="limited">{t('buyer.optLimitedSpace')}</option>
                      <option value="no">{t('buyer.optOnStandby')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Section 04: Facility Location ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">{t('buyer.sec4Num')}</span>
                  <div>
                    <h2 className="heading-md">{t('buyer.sec4Title')}</h2>
                    <p className="body-sm text-muted">{t('buyer.sec4Desc')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="location">
                      {t('buyer.lblLocation')} <span className="required">*</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className={`form-control ${errors.location ? 'form-control--error' : ''}`}
                      placeholder={t('buyer.phLocation')}
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.location && <span className="form-error" role="alert">{errors.location}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="state">
                      {t('buyer.lblState')} <span className="required">*</span>
                    </label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      className={`form-control ${errors.state ? 'form-control--error' : ''}`}
                      placeholder={t('buyer.phState')}
                      value={form.state}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.state && <span className="form-error" role="alert">{errors.state}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="notes">{t('buyer.lblNotes')}</label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      placeholder={t('buyer.phNotes')}
                      value={form.notes}
                      onChange={handleChange}
                      disabled={loading}
                      rows={3}
                      maxLength={1000}
                    />
                    <span className="form-hint">{t('buyer.hintNotes')}</span>
                  </div>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="buyer-form-footer">
                <div className="footer-notice">
                  {t('farmer.requiredFieldsNotice', 'Fields marked * are required for algorithm matching.')}
                </div>
                <div className="flex gap-sm">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    {t('buyer.btnReset')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <LoadingSpinner label={t('buyer.writingRecord')} /> : t('buyer.btnSubmit')}
                  </button>
                </div>
              </div>
            </form>
          </FadeContent>

          {/* ── Sidebar: Procurement Standards ── */}
          <FadeContent delay={0.2} distance={20} className="buyer-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <span className="sidebar-dot" />
                <span className="heading-sm">
                  {isConfigured ? t('buyer.sidebarDbActive') : t('buyer.sidebarDbStandby')}
                </span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured
                  ? t('buyer.sidebarDbActiveDesc')
                  : t('buyer.sidebarDbStandbyDesc')}
              </p>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">{t('buyer.sidebarBestPractices')}</h3>
              <ul className="sidebar-checklist">
                <li>{t('buyer.sidebarBp1')}</li>
                <li>{t('buyer.sidebarBp2')}</li>
                <li>{t('buyer.sidebarBp3')}</li>
                <li>{t('buyer.sidebarBp4')}</li>
              </ul>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">{t('buyer.sidebarAggregationTitle')}</h3>
              <p className="body-sm text-muted">
                {t('buyer.sidebarAggregationDesc')}
              </p>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
