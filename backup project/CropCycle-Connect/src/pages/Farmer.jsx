// src/pages/Farmer.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RESIDUE_TYPES, PICKUP_PREFERENCES } from '../data/sampleData';
import { createFarmerListing, formatDbError } from '../lib/db';
import { isConfigured } from '../lib/supabase';
import { useTranslation } from '../lib/i18n';
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
  // Commercial & Quality parameters
  askingPricePerTonne: '',
  isPriceNegotiable: true,
  priceCondition: 'farm_gate',
  moisturePercent: '',
  residueForm: 'baled',
};

export default function Farmer() {
  const navigate = useNavigate();
  const { t, tResidue, tDelivery } = useTranslation();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.farmerName.trim())
      e.farmerName = t('errFarmerName') || 'Name is required';
    if (!form.residueType)
      e.residueType = t('errResidueType') || 'Select a residue type';
    if (!form.quantity || Number(form.quantity) <= 0)
      e.quantity = t('errQuantityZero') || 'Enter a valid quantity greater than zero';
    if (Number(form.quantity) > 100000)
      e.quantity = t('errQuantityMax') || 'Quantity seems unrealistically large — please double-check';
    if (!form.location.trim())
      e.location = t('errLocation') || 'Village/farm location is required';
    if (!form.state.trim())
      e.state = t('errState') || 'State is required';
    if (!form.availabilityDate)
      e.availabilityDate = t('errAvailabilityDate') || 'Pick an availability date';
    if (!form.pickupPreference)
      e.pickupPreference = t('errPickupPref') || 'Select a pickup preference';
    if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail))
      e.contactEmail = t('errEmail') || 'Enter a valid email address';
    if (form.contactPhone && !/^[0-9+\s()-]{7,15}$/.test(form.contactPhone.trim()))
      e.contactPhone = t('errPhone') || 'Enter a valid phone number';
    if (form.askingPricePerTonne !== '' && Number(form.askingPricePerTonne) < 0)
      e.askingPricePerTonne = t('errPriceNegative') || 'Asking price cannot be negative';
    if (form.moisturePercent !== '' && (Number(form.moisturePercent) < 0 || Number(form.moisturePercent) > 100))
      e.moisturePercent = t('errMoistureRange') || 'Moisture must be between 0% and 100%';
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
      const { data, error } = await createFarmerListing(form);

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
      setDbError(t('dbErrorDefault') || 'An unexpected error occurred while saving your listing. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitted(false);
    setSavedRecord(null);
    setDbError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Success state ─────────────────────────────────────────────
  if (submitted) {
    const displayQty = savedRecord
      ? `${savedRecord.quantity_tonnes} ${t('tonnes') || 'tonnes'}`
      : `${form.quantity} ${form.unit}`;

    return (
      <main className="farmer-page">
        <header className="page-header">
          <div className="container">
            <span className="section-eyebrow">{t('farmerPortalTitle') || 'Farmer Portal'}</span>
            <SplitText text={t('listingSuccessTitle') || 'Listing Successfully Registered'} tag="h1" className="display-lg" delay={0.03} />
            <p className="body-md text-muted mt-xs">
              {t('listingSuccessDesc') || 'Your agricultural residue lot has been registered into the active matching pool.'}
            </p>
          </div>
        </header>

        <div className="container section-sm">
          <FadeContent delay={0.1} distance={20} className="farmer-success reveal is-visible">
            <div className="success-banner-box">
              <div className="success-badge">
                <span className="success-dot" />
                <span>{t('verified') || 'Verified'} {t('listingRefId') || 'Listing Ref'}</span>
              </div>
              <h2 className="heading-lg mt-xs">
                {savedRecord ? (t('listingSuccessTitle') || 'Record Committed to Database') : (t('listingSuccessDesc') || 'Listing Recorded in Session Memory')}
              </h2>
              <p className="body-md text-muted mt-xs">
                {savedRecord
                  ? <>{t('listingRefId') || 'Reference Identifier'}: <code className="record-id">{savedRecord.id}</code></>
                  : (t('dbStandbyText') || 'Listing stored in local session.')}
              </p>
            </div>

            <div className="farmer-success__summary card">
              <div className="summary-header">
                <h3 className="heading-md">{t('listingFormHeader') || 'Registered Lot Specifications'}</h3>
                <span className="badge badge-green">{t('colStatus') || 'Status'}: {savedRecord?.status || (t('active') || 'Active')}</span>
              </div>
              <div className="spec-table-grid">
                <div className="spec-item">
                  <span className="label">{t('farmerNameLabel') || 'Producer / Contact'}</span>
                  <div className="spec-val">{form.farmerName}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('residueTypeLabel') || 'Residue Species'}</span>
                  <div className="spec-val text-forest font-semibold">{tResidue(form.residueType)}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('quantityLabel') || 'Batch Volume'}</span>
                  <div className="spec-val font-semibold">{displayQty}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('locationLabel') || 'Location & District'}</span>
                  <div className="spec-val">{form.location}{form.state ? `, ${form.state}` : ''}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('askingPriceLabel') || 'Asking Rate'}</span>
                  <div className="spec-val font-semibold text-forest">
                    {form.askingPricePerTonne ? `₹${Number(form.askingPricePerTonne).toLocaleString('en-IN')} / ${t('perTonne') || 'tonne'}` : (t('negotiableDirectly') || 'Negotiable directly')}
                    {form.priceCondition && ` (${tDelivery(form.priceCondition)})`}
                  </div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('residueFormLabel') || 'Quality & Form'}</span>
                  <div className="spec-val">
                    {form.residueForm.toUpperCase()} {form.moisturePercent ? `| ${form.moisturePercent}% ${t('moistureLabel') || 'moisture'}` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div className="farmer-success__actions">
              <button
                onClick={() => navigate(savedRecord?.id ? `/matches?listing=${savedRecord.id}` : '/matches')}
                className="btn btn-primary btn-lg"
              >
                {t('viewTopMatches') || 'Inspect Buyer Matches'}
              </button>
              <button onClick={() => navigate('/market-intelligence')} className="btn btn-secondary btn-lg">
                {t('marketIntelligence') || 'View Market Intelligence'}
              </button>
              <button onClick={handleReset} className="btn btn-outline">
                {t('addNewListing') || 'Submit Additional Lot'}
              </button>
            </div>
          </FadeContent>
        </div>
      </main>
    );
  }

  // ── Form view ─────────────────────────────────────────────────
  return (
    <main className="farmer-page">
      <header className="page-header">
        <div className="container">
          <div className="page-header__inner">
            <span className="section-eyebrow">{t('farmerPortalTitle') || 'Farmer Portal'}</span>
            <SplitText text={t('listingFormHeader') || 'Agricultural Biomass Registration'} tag="h1" className="display-lg" delay={0.03} />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '640px' }}>
              {t('farmerPortalSubtitle') ||
                'List your harvest residue volume directly on the national circular bio-economy network. Our deterministic matching engine connects your lot with nearby buyers to end field burning.'}
            </p>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        <div className="farmer-layout">
          {/* ── Main Form Column ── */}
          <FadeContent delay={0.1} distance={20} className="farmer-form-column card">
            {!isConfigured && <DbSetupBanner />}

            {dbError && (
              <DbErrorAlert
                message={dbError}
                onRetry={() => setDbError(null)}
              />
            )}

            <form onSubmit={handleSubmit} noValidate aria-label={t('listingFormHeader') || 'Residue listing form'}>
              {/* ── Section 01: Producer Information ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">01</span>
                  <div>
                    <h2 className="heading-md">{t('farmerNameLabel') || 'Producer & Point of Contact'}</h2>
                    <p className="body-sm text-muted">{t('producerContactSub') || 'Primary entity identification for logistics coordination.'}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="farmerName">
                      {t('farmerNameLabel') || 'Producer / FPO Name'} <span className="required">*</span>
                    </label>
                    <input
                      id="farmerName"
                      name="farmerName"
                      type="text"
                      className={`form-control ${errors.farmerName ? 'form-control--error' : ''}`}
                      placeholder={t('farmerNamePlaceholder') || 'e.g. Rajesh Patel or Anand FPO Cluster'}
                      value={form.farmerName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.farmerName && <span className="form-error" role="alert">{errors.farmerName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPhone">
                      {t('contactPhoneLabel') || 'Contact Phone'}
                    </label>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      className={`form-control ${errors.contactPhone ? 'form-control--error' : ''}`}
                      placeholder={t('contactPhonePlaceholder') || 'e.g. 98765 43210'}
                      value={form.contactPhone}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={20}
                    />
                    {errors.contactPhone && <span className="form-error" role="alert">{errors.contactPhone}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="contactEmail">
                      {t('contactEmailLabel') || 'Email Address (Optional)'}
                    </label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder={t('contactEmailPlaceholder') || 'e.g. contact@cooperative.in'}
                      value={form.contactEmail}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.contactEmail && <span className="form-error" role="alert">{errors.contactEmail}</span>}
                    <span className="form-hint">{t('autoNoticeHint') || 'Used strictly for automated pickup confirmation notices.'}</span>
                  </div>
                </div>
              </div>

              {/* ── Section 02: Residue Specifications ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">02</span>
                  <div>
                    <h2 className="heading-md">{t('residueTypeLabel') || 'Residue Specifications'}</h2>
                    <p className="body-sm text-muted">{t('residueSpecsSub') || 'Crop species, available tonnage, and batch volume.'}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="residueType">
                      {t('residueTypeLabel') || 'Crop Residue Type'} <span className="required">*</span>
                    </label>
                    <select
                      id="residueType"
                      name="residueType"
                      className={`form-control ${errors.residueType ? 'form-control--error' : ''}`}
                      value={form.residueType}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">{t('selectResidueTypePlaceholder') || '— Select Crop Species —'}</option>
                      {RESIDUE_TYPES.map((type) => (
                        <option key={type} value={type}>{tResidue(type)}</option>
                      ))}
                    </select>
                    {errors.residueType && <span className="form-error" role="alert">{errors.residueType}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="quantity">
                      {t('quantityLabel') || 'Estimated Lot Quantity'} <span className="required">*</span>
                    </label>
                    <div className="qty-input-wrap">
                      <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0.1"
                        step="0.5"
                        className={`form-control ${errors.quantity ? 'form-control--error' : ''}`}
                        placeholder={t('quantityPlaceholder') || 'e.g. 25'}
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
                        <option value="tonnes">{t('tonnes') || 'tonnes'}</option>
                        <option value="quintals">{t('quintals') || 'quintals'}</option>
                        <option value="kg">{t('kg') || 'kg'}</option>
                      </select>
                    </div>
                    {errors.quantity && <span className="form-error" role="alert">{errors.quantity}</span>}
                  </div>
                </div>
              </div>

              {/* ── Section 03: Geographic Coordinates ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">03</span>
                  <div>
                    <h2 className="heading-md">{t('locationLabel') || 'Field Location & Regional Cluster'}</h2>
                    <p className="body-sm text-muted">{t('fieldLocationSub') || 'Geographic data feeds the proximity and road-routing algorithm.'}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="location">
                      {t('locationLabel') || 'Farm / Village Location'} <span className="required">*</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className={`form-control ${errors.location ? 'form-control--error' : ''}`}
                      placeholder={t('locationPlaceholder') || 'e.g. Khambhat village, Anand district'}
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={300}
                    />
                    {errors.location && <span className="form-error" role="alert">{errors.location}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="district">{t('districtLabel') || 'District'}</label>
                    <input
                      id="district"
                      name="district"
                      type="text"
                      className="form-control"
                      placeholder={t('districtPlaceholder') || 'e.g. Anand'}
                      value={form.district}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="state">
                      {t('stateLabel') || 'State'} <span className="required">*</span>
                    </label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      className={`form-control ${errors.state ? 'form-control--error' : ''}`}
                      placeholder={t('selectStatePlaceholder') || 'e.g. Gujarat'}
                      value={form.state}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.state && <span className="form-error" role="alert">{errors.state}</span>}
                  </div>
                </div>
              </div>

              {/* ── Section 04: Commercial Terms & Pricing ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">04</span>
                  <div>
                    <h2 className="heading-md">{t('askingPriceLabel') || 'Commercial Terms & Residue Quality'}</h2>
                    <p className="body-sm text-muted">{t('commercialQualitySub') || 'Specify expected asking price, condition, moisture and physical form.'}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="askingPricePerTonne">
                      {t('farmerAskingPrice') || 'Asking Price'} (₹ / {t('perTonne') || 'tonne'})
                    </label>
                    <input
                      id="askingPricePerTonne"
                      name="askingPricePerTonne"
                      type="number"
                      min="0"
                      step="50"
                      className={`form-control ${errors.askingPricePerTonne ? 'form-control--error' : ''}`}
                      placeholder={t('askingPricePlaceholder') || 'e.g. 2100 (Leave empty for direct negotiation)'}
                      value={form.askingPricePerTonne}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.askingPricePerTonne && <span className="form-error" role="alert">{errors.askingPricePerTonne}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="priceCondition">
                      {t('priceConditionLabel') || 'Price Quoted Condition'}
                    </label>
                    <select
                      id="priceCondition"
                      name="priceCondition"
                      className="form-control"
                      value={form.priceCondition}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="farm_gate">{t('farmGateOption') || t('farmGate') || 'Farm Gate'}</option>
                      <option value="ex_warehouse">{t('exWarehouseOption') || t('exWarehouse') || 'Ex-Warehouse'}</option>
                      <option value="delivered">{t('deliveredOption') || t('delivered') || 'Delivered'}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="residueForm">
                      {t('residueFormLabel') || 'Residue Physical Form'}
                    </label>
                    <select
                      id="residueForm"
                      name="residueForm"
                      className="form-control"
                      value={form.residueForm}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="baled">{t('formBaled') || 'Baled (Square / Round Bales)'}</option>
                      <option value="loose">{t('formLoose') || 'Loose / Unprocessed Field Biomass'}</option>
                      <option value="shredded">{t('formShreddedStraw') || 'Shredded / Chopped Straw'}</option>
                      <option value="pelletized">{t('formPelletized') || 'Pelletized / Briquetted'}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="moisturePercent">
                      {t('moistureLabel') || 'Moisture Content (%)'}
                    </label>
                    <input
                      id="moisturePercent"
                      name="moisturePercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className={`form-control ${errors.moisturePercent ? 'form-control--error' : ''}`}
                      placeholder={t('moisturePlaceholder') || 'e.g. 12'}
                      value={form.moisturePercent}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.moisturePercent && <span className="form-error" role="alert">{errors.moisturePercent}</span>}
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
                      <span className="body-sm font-medium">{t('priceNegotiableLabel') || 'Price is negotiable based on haulage distance and batch volume'}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Section 05: Availability & Logistics ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">05</span>
                  <div>
                    <h2 className="heading-md">{t('availabilityDateLabel') || 'Availability Window & Haulage Mode'}</h2>
                    <p className="body-sm text-muted">{t('availabilityLogisticsSub') || 'Field clearance timeline and preferred loading protocol.'}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="availabilityDate">
                      {t('availabilityDateLabel') || 'Earliest Harvest Window'} <span className="required">*</span>
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
                      {t('pickupPrefLabel') || 'Haulage / Pickup Preference'} <span className="required">*</span>
                    </label>
                    <select
                      id="pickupPreference"
                      name="pickupPreference"
                      className={`form-control ${errors.pickupPreference ? 'form-control--error' : ''}`}
                      value={form.pickupPreference}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">{t('selectPickupPlaceholder') || '— Select Pickup Mode —'}</option>
                      {PICKUP_PREFERENCES.map((p) => (
                        <option key={p} value={p}>{tDelivery(p)}</option>
                      ))}
                    </select>
                    {errors.pickupPreference && <span className="form-error" role="alert">{errors.pickupPreference}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="notes">
                      {t('additionalNotesLabel') || 'Logistics Notes & Baling Condition'}
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      placeholder={t('additionalNotesPlaceholder') || 'e.g. Moisture ~12%, road accessible for 16-wheel transport, baling machine available...'}
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
              <div className="farmer-form-footer">
                <div className="footer-notice">
                  {t('requiredFieldsNote') || <>Fields marked <span className="text-danger">*</span> are required for algorithm matching.</>}
                </div>
                <div className="flex gap-sm">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    {t('resetFormBtn') || 'Reset Form'}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <LoadingSpinner label={t('submitting') || 'Writing record…'} /> : (t('submitListingBtn') || 'Submit Farm Listing')}
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
                  {isConfigured ? t('liveDbActive') : t('localStandbyEngine')}
                </span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured ? t('liveDbDesc') : t('localStandbyDesc')}
              </p>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">{t('listingQualityStandards') || 'Listing Quality Standards'}</h3>
              <ul className="sidebar-checklist">
                <li>{t('farmerGuideline1')}</li>
                <li>{t('farmerGuideline2')}</li>
                <li>{t('farmerGuideline3')}</li>
                <li>{t('farmerGuideline4')}</li>
              </ul>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">{t('systemWorkflowTitle') || 'System Workflow'}</h3>
              <ol className="sidebar-steps">
                <li>{t('workflowStep1')}</li>
                <li>{t('workflowStep2')}</li>
                <li>{t('workflowStep3')}</li>
                <li>{t('workflowStep4')}</li>
              </ol>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
