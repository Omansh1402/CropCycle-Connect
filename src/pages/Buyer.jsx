// src/pages/Buyer.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RESIDUE_TYPES, INTENDED_USES } from '../data/sampleData';
import { createBuyerRequirement, formatDbError } from '../lib/db';
import { isConfigured } from '../lib/supabase';
import { useTranslation } from '../lib/i18n';
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
  // Commercial & Purchasing Purpose metadata
  offeredPricePerTonne: '',
  purchasingPurpose: 'Biomass Power Generation',
  isPriceNegotiable: true,
  deliveryTermPreference: 'delivered',
  maxAcceptableMoisture: '',
  preferredResidueForm: 'baled',
};

const ORG_TYPES = [
  'Private Company',
  'Cooperative Society',
  'Government Body',
  'NGO / Trust',
  'Research Institution',
  'Individual / Farm',
];

const PURCHASING_PURPOSES = [
  'Biomass Power Generation',
  'Biofuel Production',
  'Biogas Production',
  'Compost and Organic Fertilizer',
  'Cattle Feed',
  'Industrial Raw Material',
  'Mushroom Cultivation',
  'Packaging Material',
];

export default function Buyer() {
  const navigate = useNavigate();
  const { t, tResidue, tPurpose, tIndustry, tDelivery } = useTranslation();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.orgName.trim())
      e.orgName = t('errOrgName') || 'Organisation / name is required';
    if (form.acceptedTypes.length === 0)
      e.acceptedTypes = t('errAcceptedTypes') || 'Select at least one residue type';
    if (!form.requiredQuantity || Number(form.requiredQuantity) <= 0)
      e.requiredQuantity = t('errReqQtyZero') || 'Enter a required quantity greater than zero';
    if (form.maxIntake && Number(form.maxIntake) < Number(form.requiredQuantity))
      e.maxIntake = t('errMaxIntake') || 'Max intake cannot be less than required quantity';
    if (!form.location.trim())
      e.location = t('errFacilityLoc') || 'Facility location is required';
    if (!form.state.trim())
      e.state = t('errBuyerState') || 'State is required';
    if (!form.intendedUse)
      e.intendedUse = t('errIntendedUse') || 'Select intended use';
    if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail))
      e.contactEmail = t('errEmail') || 'Enter a valid email address';
    if (form.contactPhone && !/^[0-9+\s()-]{7,15}$/.test(form.contactPhone.trim()))
      e.contactPhone = t('errPhone') || 'Enter a valid phone number';
    if (form.offeredPricePerTonne !== '' && Number(form.offeredPricePerTonne) < 0)
      e.offeredPricePerTonne = t('errPriceNegative') || 'Offered price cannot be negative';
    if (form.maxAcceptableMoisture !== '' && (Number(form.maxAcceptableMoisture) < 0 || Number(form.maxAcceptableMoisture) > 100))
      e.maxAcceptableMoisture = t('errMoistureRange') || 'Moisture must be between 0% and 100%';
    return e;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (dbError) setDbError(null);
  };

  const toggleResidueType = (type) => {
    setForm((prev) => {
      const has = prev.acceptedTypes.includes(type);
      return {
        ...prev,
        acceptedTypes: has
          ? prev.acceptedTypes.filter((item) => item !== type)
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
      const { data, error } = await createBuyerRequirement(form);

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
      setDbError(t('dbErrorDefault') || 'An unexpected error occurred. Please try again.');
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
            <span className="section-eyebrow">{t('enterpriseSourcingProtocol')}</span>
            <SplitText text={t('demandProfileRegistered')} tag="h1" className="display-lg" delay={0.03} />
            <p className="body-md text-muted mt-xs">
              {t('feedstockProcurementSub')}
            </p>
          </div>
        </header>

        <div className="container section-sm">
          <FadeContent delay={0.1} distance={20} className="buyer-success reveal is-visible">
            <div className="success-banner-box">
              <div className="success-badge">
                <span className="success-dot" />
                <span>{t('demandProfileRegistered')}</span>
              </div>
              <h2 className="heading-lg mt-xs">
                {savedRecord ? (t('listingSuccessTitle') || 'Record Committed to Database') : (t('demandRecordedLocal') || 'Demand Profile Stored in Local Session')}
              </h2>
              <p className="body-md text-muted mt-xs">
                {savedRecord
                  ? <>{t('listingRefId') || 'Reference Identifier'}: <code className="record-id">{savedRecord.id}</code>. {t('matchingEngineSubtext')}</>
                  : `${t('requirementRecorded') || 'Requirement criteria recorded'}. ${form.location}`}
              </p>
            </div>

            <div className="buyer-success__summary card">
              <div className="summary-header">
                <h3 className="heading-md">{t('registeredFeedstockProfile')}</h3>
                <span className="badge badge-green">{t('intakeModeActive')}</span>
              </div>
              <div className="spec-table-grid">
                <div className="spec-item">
                  <span className="label">{t('enterprise')}</span>
                  <div className="spec-val font-semibold">{form.orgName}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('buyerPurpose')}</span>
                  <div className="spec-val font-semibold text-forest">{tPurpose(form.purchasingPurpose)}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('facilityLocationLabel')}</span>
                  <div className="spec-val">{form.location}, {form.state}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('targetBatchVolume')}</span>
                  <div className="spec-val font-semibold text-forest">{form.requiredQuantity} {t('tonnes')}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('offeredPurchaseRate')}</span>
                  <div className="spec-val font-semibold text-forest">
                    {form.offeredPricePerTonne ? `₹${Number(form.offeredPricePerTonne).toLocaleString('en-IN')} / ${t('perTonne')}` : t('openToQuote')}
                    {` (${tDelivery(form.deliveryTermPreference)})`}
                  </div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('formAndMaxMoisture')}</span>
                  <div className="spec-val">
                    {form.preferredResidueForm.toUpperCase()} {form.maxAcceptableMoisture ? `| Max ${form.maxAcceptableMoisture}%` : ''}
                  </div>
                </div>
              </div>

              <div className="mt-lg pt-md" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <span className="label">{t('acceptedResiduesLabel')}</span>
                <div className="tag-list mt-xs">
                  {form.acceptedTypes.map((type) => (
                    <span key={type} className="badge badge-green">{tResidue(type)}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="buyer-success__actions">
              <button onClick={() => navigate('/matches')} className="btn btn-primary btn-lg">
                {t('inspectFarmSupply')}
              </button>
              <button onClick={() => navigate('/market-intelligence')} className="btn btn-secondary btn-lg">
                {t('marketIntelligence')}
              </button>
              <button onClick={handleReset} className="btn btn-outline">
                {t('registerAdditionalSpec')}
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
            <span className="section-eyebrow">{t('enterpriseSourcingProtocol')}</span>
            <SplitText text={t('registerFeedstockDemand')} tag="h1" className="display-lg" delay={0.03} />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '600px' }}>
              {t('buyerSubtitle')}
            </p>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        <div className="buyer-layout">
          <FadeContent delay={0.1} distance={20} className="buyer-form-wrap">
            {!isConfigured && <DbSetupBanner />}
            {dbError && <DbErrorAlert message={dbError} onRetry={() => setDbError(null)} />}

            <form onSubmit={handleSubmit} noValidate aria-label={t('registerFeedstockDemand')}>
              {/* ── Section 01: Enterprise Details ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">01</span>
                  <div>
                    <h2 className="heading-md">{t('enterpriseInformation')}</h2>
                    <p className="body-sm text-muted">{t('enterpriseInfoSub')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="orgName">
                      {t('orgNameLabel')} <span className="required">*</span>
                    </label>
                    <input
                      id="orgName"
                      name="orgName"
                      type="text"
                      className={`form-control ${errors.orgName ? 'form-control--error' : ''}`}
                      placeholder={t('orgNamePlaceholder')}
                      value={form.orgName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={150}
                    />
                    {errors.orgName && <span className="form-error" role="alert">{errors.orgName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="orgType">{t('orgTypeLabel')}</label>
                    <select
                      id="orgType"
                      name="orgType"
                      className="form-control"
                      value={form.orgType}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">{t('selectEntityStructure')}</option>
                      {ORG_TYPES.map((type) => <option key={type} value={type}>{tIndustry(type)}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPerson">{t('procurementOfficerLabel')}</label>
                    <input
                      id="contactPerson"
                      name="contactPerson"
                      type="text"
                      className="form-control"
                      placeholder={t('contactPersonPlaceholder')}
                      value={form.contactPerson}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPhone">{t('contactPhoneLabel')}</label>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      className={`form-control ${errors.contactPhone ? 'form-control--error' : ''}`}
                      placeholder={t('contactPhonePlaceholder')}
                      value={form.contactPhone}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={20}
                    />
                    {errors.contactPhone && <span className="form-error" role="alert">{errors.contactPhone}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="contactEmail">{t('corporateEmailLabel')}</label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder={t('contactEmailPlaceholder')}
                      value={form.contactEmail}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.contactEmail && <span className="form-error" role="alert">{errors.contactEmail}</span>}
                  </div>
                </div>
              </div>

              {/* ── Section 02: Accepted Residues ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">02</span>
                  <div>
                    <h2 className="heading-md">{t('targetBiomassVarieties')}</h2>
                    <p className="body-sm text-muted">{t('targetBiomassVarietiesSub')}</p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t('acceptableCropSpecies')} <span className="required">*</span>
                  </label>
                  <div className="residue-checkbox-grid" role="group" aria-label={t('acceptedResiduesLabel')}>
                    {RESIDUE_TYPES.map((type) => {
                      const selected = form.acceptedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          className={`residue-type-btn ${selected ? 'is-selected' : ''}`}
                          onClick={() => toggleResidueType(type)}
                          disabled={loading}
                          aria-pressed={selected}
                        >
                          {selected && <span className="btn-check">✓ </span>}
                          {tResidue(type)}
                        </button>
                      );
                    })}
                  </div>
                  {errors.acceptedTypes && (
                    <span className="form-error mt-xs" role="alert">{errors.acceptedTypes}</span>
                  )}
                  <span className="form-hint mt-xs">
                    {t('varietiesIndexedHint', { count: form.acceptedTypes.length })}
                  </span>
                </div>
              </div>

              {/* ── Section 03: Intake Capacities & Transformation ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">03</span>
                  <div>
                    <h2 className="heading-md">{t('tonnageTransformation')}</h2>
                    <p className="body-sm text-muted">{t('tonnageTransformationSub')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="requiredQuantity">
                      {t('minBatchVolume')} <span className="required">*</span>
                    </label>
                    <input
                      id="requiredQuantity"
                      name="requiredQuantity"
                      type="number"
                      min="1"
                      className={`form-control ${errors.requiredQuantity ? 'form-control--error' : ''}`}
                      placeholder={t('requiredQuantityPlaceholder')}
                      value={form.requiredQuantity}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.requiredQuantity && <span className="form-error" role="alert">{errors.requiredQuantity}</span>}
                    <span className="form-hint">{t('minLotSizeHint')}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="maxIntake">
                      {t('maxYardIntake')}
                    </label>
                    <input
                      id="maxIntake"
                      name="maxIntake"
                      type="number"
                      min="1"
                      className={`form-control ${errors.maxIntake ? 'form-control--error' : ''}`}
                      placeholder={t('maxIntakePlaceholder')}
                      value={form.maxIntake}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.maxIntake && <span className="form-error" role="alert">{errors.maxIntake}</span>}
                    <span className="form-hint">{t('maxYardIntakeHint')}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="intendedUse">
                      {t('industrialEndUse')} <span className="required">*</span>
                    </label>
                    <select
                      id="intendedUse"
                      name="intendedUse"
                      className={`form-control ${errors.intendedUse ? 'form-control--error' : ''}`}
                      value={form.intendedUse}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">{t('selectTargetApp')}</option>
                      {INTENDED_USES.map((u) => <option key={u} value={u}>{tPurpose(u)}</option>)}
                    </select>
                    {errors.intendedUse && <span className="form-error" role="alert">{errors.intendedUse}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="available">{t('currentIntakeStatus')}</label>
                    <select
                      id="available"
                      name="available"
                      className="form-control"
                      value={form.available}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="yes">{t('acceptingDeliveries')}</option>
                      <option value="limited">{t('limitedYardSpace')}</option>
                      <option value="no">{t('tempStandby')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Section 04: Commercial Terms & Purchasing Purpose ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">04</span>
                  <div>
                    <h2 className="heading-md">{t('commercialTermsHeading')}</h2>
                    <p className="body-sm text-muted">{t('commercialTermsSub')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="purchasingPurpose">
                      {t('buyerPurpose')} <span className="required">*</span>
                    </label>
                    <select
                      id="purchasingPurpose"
                      name="purchasingPurpose"
                      className="form-control"
                      value={form.purchasingPurpose}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      {PURCHASING_PURPOSES.map((p) => (
                        <option key={p} value={p}>{tPurpose(p)}</option>
                      ))}
                    </select>
                    <span className="form-hint">{t('displayedInSmartCards')}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="offeredPricePerTonne">
                      {t('buyerOfferedPrice')} (₹ / {t('perTonne')})
                    </label>
                    <input
                      id="offeredPricePerTonne"
                      name="offeredPricePerTonne"
                      type="number"
                      min="0"
                      step="50"
                      className={`form-control ${errors.offeredPricePerTonne ? 'form-control--error' : ''}`}
                      placeholder={t('offeredRatePlaceholder')}
                      value={form.offeredPricePerTonne}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.offeredPricePerTonne && <span className="form-error" role="alert">{errors.offeredPricePerTonne}</span>}
                    <span className="form-hint">{t('procurementBudgetHint')}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="deliveryTermPreference">
                      {t('deliveryTermPreference')}
                    </label>
                    <select
                      id="deliveryTermPreference"
                      name="deliveryTermPreference"
                      className="form-control"
                      value={form.deliveryTermPreference}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="delivered">{t('delivered')} ({t('deliveredToFacility')})</option>
                      <option value="farm_gate">{t('farmGate')} ({t('buyerArrangesPickup')})</option>
                      <option value="ex_warehouse">{t('exWarehouse')} ({t('exWarehouseCollection')})</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="preferredResidueForm">
                      {t('preferredResidueForm')}
                    </label>
                    <select
                      id="preferredResidueForm"
                      name="preferredResidueForm"
                      className="form-control"
                      value={form.preferredResidueForm}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="baled">{t('formBaledSquare')}</option>
                      <option value="loose">{t('formLooseBiomass')}</option>
                      <option value="shredded">{t('formShreddedStraw')}</option>
                      <option value="pelletized">{t('formPelletizedBriquettes')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="maxAcceptableMoisture">
                      {t('maxAcceptableMoisture')}
                    </label>
                    <input
                      id="maxAcceptableMoisture"
                      name="maxAcceptableMoisture"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className={`form-control ${errors.maxAcceptableMoisture ? 'form-control--error' : ''}`}
                      placeholder={t('maxMoisturePlaceholder')}
                      value={form.maxAcceptableMoisture}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.maxAcceptableMoisture && <span className="form-error" role="alert">{errors.maxAcceptableMoisture}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="flex items-center gap-xs cursor-pointer">
                      <input
                        type="checkbox"
                        name="isPriceNegotiable"
                        checked={form.isPriceNegotiable}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      <span className="body-sm font-medium">{t('rateNegotiableNote')}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Section 05: Facility Location ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">05</span>
                  <div>
                    <h2 className="heading-md">{t('facilityYardLocation')}</h2>
                    <p className="body-sm text-muted">{t('facilityYardLocationSub')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="location">
                      {t('cityIndustrialArea')} <span className="required">*</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className={`form-control ${errors.location ? 'form-control--error' : ''}`}
                      placeholder={t('facilityLocationPlaceholder')}
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.location && <span className="form-error" role="alert">{errors.location}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="state">
                      {t('buyerStateLabel')} <span className="required">*</span>
                    </label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      className={`form-control ${errors.state ? 'form-control--error' : ''}`}
                      placeholder={t('selectStatePlaceholder')}
                      value={form.state}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.state && <span className="form-error" role="alert">{errors.state}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="notes">{t('intakeSpecsNotes')}</label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      placeholder={t('buyerNotesPlaceholder')}
                      value={form.notes}
                      onChange={handleChange}
                      disabled={loading}
                      rows={3}
                      maxLength={1000}
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="buyer-form-footer">
                <div className="footer-notice">
                  {t('requiredFieldsNote')}
                </div>
                <div className="flex gap-sm">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    {t('resetFormBtn')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <LoadingSpinner label={t('writingRequirement')} /> : t('indexSourcingDemandBtn')}
                  </button>
                </div>
              </div>
            </form>
          </FadeContent>

          {/* ── Sidebar ── */}
          <FadeContent delay={0.2} distance={20} className="buyer-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <span className="sidebar-dot" />
                <span className="heading-sm">{isConfigured ? t('liveDbActive') : t('sessionMemoryEngine')}</span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured ? t('liveDbDesc') : t('localStandbyDesc')}
              </p>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">{t('industrialFeedstockGuidelines')}</h3>
              <ul className="sidebar-checklist">
                <li>{t('buyerGuideline1')}</li>
                <li>{t('buyerGuideline2')}</li>
                <li>{t('buyerGuideline3')}</li>
                <li>{t('buyerGuideline4')}</li>
              </ul>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
