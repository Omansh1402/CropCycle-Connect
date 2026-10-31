import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RESIDUE_TYPES, PICKUP_PREFERENCES } from '../data/sampleData';
import { createFarmerListing, formatDbError } from '../lib/db';
import { isConfigured } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { DbSetupBanner, DbErrorAlert, LoadingSpinner } from '../components/DbStatus';
import SplitText from '../components/reactbits/SplitText';
import FadeContent from '../components/reactbits/FadeContent';
import './Farmer.css';

const TODAY_DATE = new Date().toISOString().split('T')[0];

const INITIAL_FORM = {
  farmerName: '',
  residueType: '',
  quantity: '',
  unit: 'tonnes',
  location: '',
  district: '',
  state: '',
  availabilityDate: '',
  pickupPreference: '',
  notes: '',
  contactEmail: '',
  contactPhone: '',
};

export default function Farmer() {
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
        farmerName: prev.farmerName || profile?.full_name || '',
        contactEmail: prev.contactEmail || user?.email || '',
        contactPhone: prev.contactPhone || profile?.phone || '',
        location: prev.location || profile?.location || '',
        district: prev.district || profile?.district || '',
        state: prev.state || profile?.state || '',
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, [user, profile]);

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.farmerName.trim())
      e.farmerName = t('farmer.errName');
    if (!form.residueType)
      e.residueType = t('farmer.errResidueType');
    if (!form.quantity || Number(form.quantity) <= 0)
      e.quantity = t('farmer.errQtyPositive');
    if (Number(form.quantity) > 100000)
      e.quantity = t('farmer.errQtyLarge');
    if (!form.location.trim())
      e.location = t('farmer.errLocation');
    if (!form.state.trim())
      e.state = t('farmer.errState');
    if (!form.availabilityDate)
      e.availabilityDate = t('farmer.errDate');
    if (!form.pickupPreference)
      e.pickupPreference = t('farmer.errPickup');
    if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail))
      e.contactEmail = t('farmer.errEmail');
    if (form.contactPhone && !/^[0-9+\s()-]{7,15}$/.test(form.contactPhone.trim()))
      e.contactPhone = t('farmer.errPhone');
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (dbError) setDbError(null);
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
      const { data, error } = await createFarmerListing(form, user?.id);

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
      setDbError(t('farmer.errUnexpected'));
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
    const displayQty = savedRecord
      ? `${savedRecord.quantity_tonnes} ${t('common.tonnes', 'tonnes')}`
      : `${form.quantity} ${t(`common.${form.unit}`, form.unit)}`;

    return (
      <main className="farmer-page">
        <header className="page-header">
          <div className="container">
            <span className="section-eyebrow">{t('farmer.eyebrow')}</span>
            <SplitText
              key={`success-title-${i18n.language}`}
              text={t('farmer.successTitle')}
              tag="h1"
              className="display-lg"
              delay={0.03}
            />
            <p className="body-md text-muted mt-xs">
              {t('farmer.successSubtitle')}
            </p>
          </div>
        </header>

        <div className="container section-sm">
          <FadeContent delay={0.1} distance={20} className="farmer-success reveal is-visible">
            <div className="success-banner-box">
              <div className="success-badge">
                <span className="success-dot" />
                <span>{t('farmer.verifiedConfirmation')}</span>
              </div>
              <h2 className="heading-lg mt-xs">
                {savedRecord ? t('farmer.recordCommittedDb') : t('farmer.recordStoredLocal')}
              </h2>
              <p className="body-md text-muted mt-xs">
                {savedRecord
                  ? <>{t('farmer.refIdPrefix')}<code className="record-id">{savedRecord.id}</code>{t('farmer.refIdSuffix')}</>
                  : t('farmer.localNotice')}
              </p>
            </div>

            <div className="farmer-success__summary card">
              <div className="summary-header">
                <h3 className="heading-md">{t('farmer.summaryTitle')}</h3>
                <span className="badge badge-green">
                  {t('farmer.statusActive')}
                </span>
              </div>
              <div className="spec-table-grid">
                <div className="spec-item">
                  <span className="label">{t('farmer.lblProducerContact')}</span>
                  <div className="spec-val">{form.farmerName}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.lblResidueSpecies')}</span>
                  <div className="spec-val text-forest font-semibold">
                    {t(`crops.${form.residueType}`, form.residueType)}
                  </div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.lblBatchVolume')}</span>
                  <div className="spec-val font-semibold">{displayQty}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.lblLocationDistrict')}</span>
                  <div className="spec-val">{form.location}{form.state ? `, ${form.state}` : ''}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.lblEarliestAvailability')}</span>
                  <div className="spec-val">{form.availabilityDate}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.lblHaulagePreference')}</span>
                  <div className="spec-val">
                    {t(`pickup.${form.pickupPreference}`, form.pickupPreference)}
                  </div>
                </div>
              </div>
            </div>

            <div className="farmer-success__actions">
              <button
                onClick={() => navigate(savedRecord?.id ? `/matches?listing=${savedRecord.id}` : '/matches')}
                className="btn btn-primary btn-lg"
              >
                {t('farmer.btnInspectMatches')}
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-lg">
                {t('farmer.btnViewDashboard')}
              </button>
              <button onClick={handleReset} className="btn btn-outline">
                {t('farmer.btnSubmitAdditional')}
              </button>
            </div>
          </FadeContent>
        </div>
      </main>
    );
  }

  // ── Main form ─────────────────────────────────────────────────
  return (
    <main className="farmer-page">
      <header className="page-header">
        <div className="container">
          <div className="page-header__inner">
            <span className="section-eyebrow">{t('farmer.eyebrow')}</span>
            <SplitText
              key={`farmer-heading-${i18n.language}`}
              text={t('farmer.title')}
              tag="h1"
              className="display-lg"
              delay={0.03}
            />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '600px' }}>
              {t('farmer.subtitle')}
            </p>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        <div className="farmer-layout">
          <FadeContent delay={0.1} distance={20} className="farmer-form-wrap">
            {/* DB setup banner (shown when not configured) */}
            {!isConfigured && <DbSetupBanner />}

            {/* DB error alert */}
            {dbError && (
              <DbErrorAlert
                message={dbError}
                onRetry={() => setDbError(null)}
              />
            )}

            <form onSubmit={handleSubmit} noValidate aria-label={t('farmer.title')}>
              {/* ── Section 01: Producer Information ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">{t('farmer.sec1Num')}</span>
                  <div>
                    <h2 className="heading-md">{t('farmer.sec1Title')}</h2>
                    <p className="body-sm text-muted">{t('farmer.sec1Desc')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="farmerName">
                      {t('farmer.lblProducerName')} <span className="required">*</span>
                    </label>
                    <input
                      id="farmerName"
                      name="farmerName"
                      type="text"
                      className={`form-control ${errors.farmerName ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.phProducerName')}
                      value={form.farmerName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.farmerName && <span className="form-error" role="alert">{errors.farmerName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPhone">
                      {t('farmer.lblContactPhone')}
                    </label>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      className={`form-control ${errors.contactPhone ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.phContactPhone')}
                      value={form.contactPhone}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={20}
                    />
                    {errors.contactPhone && <span className="form-error" role="alert">{errors.contactPhone}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="contactEmail">
                      {t('farmer.lblEmail')}
                    </label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.phEmail')}
                      value={form.contactEmail}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.contactEmail && <span className="form-error" role="alert">{errors.contactEmail}</span>}
                    <span className="form-hint">{t('farmer.hintEmail')}</span>
                  </div>
                </div>
              </div>

              {/* ── Section 02: Residue Specifications ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">{t('farmer.sec2Num')}</span>
                  <div>
                    <h2 className="heading-md">{t('farmer.sec2Title')}</h2>
                    <p className="body-sm text-muted">{t('farmer.sec2Desc')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="residueType">
                      {t('farmer.lblResidueType')} <span className="required">*</span>
                    </label>
                    <select
                      id="residueType"
                      name="residueType"
                      className={`form-control ${errors.residueType ? 'form-control--error' : ''}`}
                      value={form.residueType}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">{t('farmer.selectCropSpecies')}</option>
                      {RESIDUE_TYPES.map((cropKey) => (
                        <option key={cropKey} value={cropKey}>
                          {t(`crops.${cropKey}`, cropKey)}
                        </option>
                      ))}
                    </select>
                    {errors.residueType && <span className="form-error" role="alert">{errors.residueType}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="quantity">
                      {t('farmer.lblEstimatedQty')} <span className="required">*</span>
                    </label>
                    <div className="qty-input-wrap">
                      <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0.1"
                        step="0.5"
                        className={`form-control ${errors.quantity ? 'form-control--error' : ''}`}
                        placeholder={t('farmer.phEstimatedQty')}
                        value={form.quantity}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      <select
                        name="unit"
                        className="form-control qty-unit"
                        value={form.unit}
                        onChange={handleChange}
                        disabled={loading}
                        aria-label="Unit of measurement"
                      >
                        <option value="tonnes">{t('common.tonnes', 'tonnes')}</option>
                        <option value="quintals">{t('common.quintals', 'quintals')}</option>
                        <option value="kg">{t('common.kg', 'kg')}</option>
                      </select>
                    </div>
                    {errors.quantity && <span className="form-error" role="alert">{errors.quantity}</span>}
                    {form.unit !== 'tonnes' && form.quantity > 0 && (
                      <span className="form-hint">
                        {t('farmer.normalizedTonnes', {
                          count: form.unit === 'quintals'
                            ? (Number(form.quantity) / 10).toFixed(2)
                            : (Number(form.quantity) / 1000).toFixed(3)
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section 03: Geographic Coordinates ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">{t('farmer.sec3Num')}</span>
                  <div>
                    <h2 className="heading-md">{t('farmer.sec3Title')}</h2>
                    <p className="body-sm text-muted">{t('farmer.sec3Desc')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="location">
                      {t('farmer.lblFarmLocation')} <span className="required">*</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className={`form-control ${errors.location ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.phFarmLocation')}
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={300}
                    />
                    {errors.location && <span className="form-error" role="alert">{errors.location}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="district">{t('farmer.lblDistrict')}</label>
                    <input
                      id="district"
                      name="district"
                      type="text"
                      className="form-control"
                      placeholder={t('farmer.phDistrict')}
                      value={form.district}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="state">
                      {t('farmer.lblState')} <span className="required">*</span>
                    </label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      className={`form-control ${errors.state ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.phState')}
                      value={form.state}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.state && <span className="form-error" role="alert">{errors.state}</span>}
                  </div>
                </div>
              </div>

              {/* ── Section 04: Availability & Logistics ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">{t('farmer.sec4Num')}</span>
                  <div>
                    <h2 className="heading-md">{t('farmer.sec4Title')}</h2>
                    <p className="body-sm text-muted">{t('farmer.sec4Desc')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="availabilityDate">
                      {t('farmer.lblHarvestWindow')} <span className="required">*</span>
                    </label>
                    <input
                      id="availabilityDate"
                      name="availabilityDate"
                      type="date"
                      className={`form-control ${errors.availabilityDate ? 'form-control--error' : ''}`}
                      value={form.availabilityDate}
                      onChange={handleChange}
                      disabled={loading}
                      min={TODAY_DATE}
                    />
                    {errors.availabilityDate && <span className="form-error" role="alert">{errors.availabilityDate}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="pickupPreference">
                      {t('farmer.lblPickupPreference')} <span className="required">*</span>
                    </label>
                    <select
                      id="pickupPreference"
                      name="pickupPreference"
                      className={`form-control ${errors.pickupPreference ? 'form-control--error' : ''}`}
                      value={form.pickupPreference}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">{t('farmer.selectPickupMode')}</option>
                      {PICKUP_PREFERENCES.map((pref) => (
                        <option key={pref} value={pref}>
                          {t(`pickup.${pref}`, pref)}
                        </option>
                      ))}
                    </select>
                    {errors.pickupPreference && <span className="form-error" role="alert">{errors.pickupPreference}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="notes">
                      {t('farmer.lblLogisticsNotes')}
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      placeholder={t('farmer.phLogisticsNotes')}
                      value={form.notes}
                      onChange={handleChange}
                      disabled={loading}
                      rows={3}
                      maxLength={1000}
                    />
                    <span className="form-hint">{t('farmer.hintLogisticsNotes')}</span>
                  </div>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="farmer-form-footer">
                <div className="footer-notice">
                  {t('farmer.requiredFieldsNotice')}
                </div>
                <div className="flex gap-sm">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    {t('farmer.btnReset')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <LoadingSpinner label={t('farmer.writingRecord')} /> : t('farmer.btnSubmit')}
                  </button>
                </div>
              </div>
            </form>
          </FadeContent>

          {/* ── Sidebar: Verification & Guidance ── */}
          <FadeContent delay={0.2} distance={20} className="farmer-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <span className="sidebar-dot" />
                <span className="heading-sm">
                  {isConfigured ? t('farmer.sidebarLiveDb') : t('farmer.sidebarLocalEngine')}
                </span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured
                  ? t('farmer.sidebarLiveDbDesc')
                  : t('farmer.sidebarLocalEngineDesc')}
              </p>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">{t('farmer.sidebarQualityStandards')}</h3>
              <ul className="sidebar-checklist">
                <li>{t('farmer.std1')}</li>
                <li>{t('farmer.std2')}</li>
                <li>{t('farmer.std3')}</li>
                <li>{t('farmer.std4')}</li>
              </ul>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">{t('farmer.sidebarWorkflow')}</h3>
              <ol className="sidebar-steps">
                <li><strong>{t('farmer.wf1Title')}</strong> {t('farmer.wf1Desc')}</li>
                <li><strong>{t('farmer.wf2Title')}</strong> {t('farmer.wf2Desc')}</li>
                <li><strong>{t('farmer.wf3Title')}</strong> {t('farmer.wf3Desc')}</li>
                <li><strong>{t('farmer.wf4Title')}</strong> {t('farmer.wf4Desc')}</li>
              </ol>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
