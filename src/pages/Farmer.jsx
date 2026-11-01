import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RESIDUE_TYPES, PICKUP_PREFERENCES } from '../data/sampleData';
import { createFarmerListing } from '../lib/db';
import { isConfigured } from '../lib/supabase';
import { useTranslation } from '../lib/i18n';
import { currentUser } from '../lib/auth';
import { DbSetupBanner, DbErrorAlert, LoadingSpinner } from '../components/DbStatus';
import SplitText from '../components/reactbits/SplitText';
import FadeContent from '../components/reactbits/FadeContent';
import './Farmer.css';

const TODAY_DATE = new Date().toISOString().split('T')[0];
const user = currentUser();

const INITIAL_FORM = {
  farmerName: user?.name || '',
  residueType: '',
  quantity: '',
  unit: 'tonnes',
  location: '',
  district: user?.district || '',
  state: '',
  availabilityDate: '',
  pickupPreference: '',
  notes: '',
  contactEmail: '',
  contactPhone: user?.phone || '',
  // Commercial & Quality parameters
  askingPricePerTonne: '',
  isPriceNegotiable: true,
  priceCondition: 'farm_gate',
  moisturePercent: '',
  residueForm: 'baled',
};

export default function Farmer() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      e.farmerName = t('farmer.validation.nameRequired');
    if (!form.residueType)
      e.residueType = t('farmer.validation.residueRequired');
    if (!form.quantity || Number(form.quantity) <= 0)
      e.quantity = t('farmer.validation.quantityInvalid');
    if (Number(form.quantity) > 100000)
      e.quantity = t('farmer.validation.quantityLarge');
    if (!form.location.trim())
      e.location = t('farmer.validation.locationRequired');
    if (!form.state.trim())
      e.state = t('farmer.validation.stateRequired');
    if (!form.availabilityDate)
      e.availabilityDate = t('farmer.validation.dateRequired');
    if (!form.pickupPreference)
      e.pickupPreference = t('farmer.validation.pickupRequired');
    if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail))
      e.contactEmail = t('farmer.validation.emailInvalid');
    if (form.contactPhone && !/^[0-9+\s()-]{7,15}$/.test(form.contactPhone.trim()))
      e.contactPhone = t('farmer.validation.phoneInvalid');
    if (form.askingPricePerTonne !== '' && Number(form.askingPricePerTonne) < 0)
      e.askingPricePerTonne = t('farmer.validation.priceNegative');
    if (form.moisturePercent !== '' && (Number(form.moisturePercent) < 0 || Number(form.moisturePercent) > 100))
      e.moisturePercent = t('farmer.validation.moistureRange');
    return e;
  };

  const getLocalizedDbError = (error) => {
    if (error?.code === '23514') return t('farmer.dbError.checkConstraint');
    if (error?.code === '23502') return t('farmer.dbError.requiredField');
    if (error?.code === '23503') return t('farmer.dbError.reference');
    if (error?.code === '42501') return t('farmer.dbError.permission');
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
      return t('farmer.dbError.network');
    }
    return t('farmer.dbError.generic');
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
        setDbError(getLocalizedDbError(error));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSavedRecord(data);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setDbError(t('farmer.dbUnexpected'));
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
      ? t('farmer.success.storedQuantity', { quantity: savedRecord.quantity_tonnes, unit: t('farmer.unit.tonnes') })
      : `${form.quantity} ${t(`farmer.unit.${form.unit}`)}`;
    const referenceParts = t('farmer.success.reference').split('{id}');
    const priceCondition = form.priceCondition === 'farm_gate'
      ? t('farmGate')
      : form.priceCondition === 'ex_warehouse'
        ? t('exWarehouse')
        : t('delivered');
    const residueFormLabel = t(`farmer.residueForm.${form.residueForm}`);

    return (
      <main className="farmer-page">
        <header className="page-header">
          <div className="container">
            <span className="section-eyebrow">{t('farmer.success.eyebrow')}</span>
            <SplitText text={t('farmer.success.title')} tag="h1" className="display-lg" delay={0.03} />
            <p className="body-md text-muted mt-xs">
              {t('farmer.success.intro')}
            </p>
          </div>
        </header>

        <div className="container section-sm">
          <FadeContent delay={0.1} distance={20} className="farmer-success reveal is-visible">
            <div className="success-banner-box">
              <div className="success-badge">
                <span className="success-dot" />
                <span>{t('farmer.success.badge')}</span>
              </div>
              <h2 className="heading-lg mt-xs">
                {savedRecord ? t('farmer.success.databaseTitle') : t('farmer.success.sessionTitle')}
              </h2>
              <p className="body-md text-muted mt-xs">
                {savedRecord
                  ? <>{referenceParts[0]}<code className="record-id">{savedRecord.id}</code>{referenceParts[1]}</>
                  : t('farmer.success.localNotice')}
              </p>
            </div>

            <div className="farmer-success__summary card">
              <div className="summary-header">
                <h3 className="heading-md">{t('farmer.success.specifications')}</h3>
                <span className="badge badge-green">{t('farmer.success.status')}: {t(`farmer.status.${(savedRecord?.status || 'Active').toLowerCase()}`)}</span>
              </div>
              <div className="spec-table-grid">
                <div className="spec-item">
                  <span className="label">{t('farmer.success.producerContact')}</span>
                  <div className="spec-val">{form.farmerName}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.success.residue')}</span>
                  <div className="spec-val text-forest font-semibold">{t(`crop.${form.residueType}`)}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.success.batchVolume')}</span>
                  <div className="spec-val font-semibold">{displayQty}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.success.locationDistrict')}</span>
                  <div className="spec-val">{form.location}{form.state ? `, ${form.state}` : ''}</div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.success.askingRate')}</span>
                  <div className="spec-val font-semibold text-forest">
                    {form.askingPricePerTonne ? t('farmer.success.pricePerUnit', { price: Number(form.askingPricePerTonne).toLocaleString('en-IN'), unit: t('farmer.unit.tonnes') }) : t('farmer.success.negotiable')}
                    {form.priceCondition && ` (${priceCondition})`}
                  </div>
                </div>
                <div className="spec-item">
                  <span className="label">{t('farmer.success.qualityForm')}</span>
                  <div className="spec-val">
                    {residueFormLabel} {form.moisturePercent ? `| ${t('farmer.success.moisture', { value: form.moisturePercent })}` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div className="farmer-success__actions">
              <button
                onClick={() => navigate(savedRecord?.id ? `/matches?listing=${savedRecord.id}` : '/matches')}
                className="btn btn-primary btn-lg"
              >
                {t('farmer.success.inspectMatches')}
              </button>
              <button onClick={() => navigate('/market-intelligence')} className="btn btn-secondary btn-lg">
                {t('farmer.success.marketIntelligence')}
              </button>
              <button onClick={handleReset} className="btn btn-outline">
                {t('farmer.success.additionalLot')}
              </button>
            </div>
          </FadeContent>
        </div>
      </main>
    );
  }

  // ── Main form ─────────────────────────────────────────────────
  const requiredNotice = t('farmer.requiredNotice').split('{mark}');

  return (
    <main className="farmer-page">
      <header className="page-header">
        <div className="container">
          <div className="page-header__inner">
            <span className="section-eyebrow">{t('farmer.page.eyebrow')}</span>
            <SplitText text={t('farmer.page.title')} tag="h1" className="display-lg" delay={0.03} />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '600px' }}>
              {t('farmer.page.intro')}{' '}{t('farmer.page.introBuyers')}
            </p>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        <div className="farmer-layout">
          <FadeContent delay={0.1} distance={20} className="farmer-form-wrap">
            {/* DB setup banner (shown when not configured) */}
            {!isConfigured && <DbSetupBanner t={t} />}

            {/* DB error alert */}
            {dbError && (
              <DbErrorAlert
                message={dbError}
                t={t}
                onRetry={() => setDbError(null)}
              />
            )}

            <form onSubmit={handleSubmit} noValidate aria-label={t('farmer.form.ariaLabel')}>
              {/* ── Section 01: Producer Information ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">01</span>
                  <div>
                    <h2 className="heading-md">{t('farmer.section.producer.title')}</h2>
                    <p className="body-sm text-muted">{t('farmer.section.producer.description')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="farmerName">
                      {t('farmer.field.producerName')} <span className="required">*</span>
                    </label>
                    <input
                      id="farmerName"
                      name="farmerName"
                      type="text"
                      className={`form-control ${errors.farmerName ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.eg', { value: 'Rajesh Patel' })}
                      value={form.farmerName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.farmerName && <span className="form-error" role="alert">{errors.farmerName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPhone">
                      {t('farmer.field.contactPhone')}
                    </label>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      className={`form-control ${errors.contactPhone ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.eg', { value: '98765 43210' })}
                      value={form.contactPhone}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={20}
                    />
                    {errors.contactPhone && <span className="form-error" role="alert">{errors.contactPhone}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="contactEmail">
                      {t('farmer.field.emailOptional')}
                    </label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.eg', { value: 'contact@cooperative.in' })}
                      value={form.contactEmail}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.contactEmail && <span className="form-error" role="alert">{errors.contactEmail}</span>}
                    <span className="form-hint">{t('farmer.hint.email')}</span>
                  </div>
                </div>
              </div>

              {/* ── Section 02: Residue Specifications ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">02</span>
                  <div>
                    <h2 className="heading-md">{t('farmer.section.residue.title')}</h2>
                    <p className="body-sm text-muted">{t('farmer.section.residue.description')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="residueType">
                      {t('farmer.field.residueType')} <span className="required">*</span>
                    </label>
                    <select
                      id="residueType"
                      name="residueType"
                      className={`form-control ${errors.residueType ? 'form-control--error' : ''}`}
                      value={form.residueType}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— {t('farmer.selectCrop')} —</option>
                      {RESIDUE_TYPES.map((residueType) => (
                        <option key={residueType} value={residueType}>{t(`crop.${residueType}`)}</option>
                      ))}
                    </select>
                    {errors.residueType && <span className="form-error" role="alert">{errors.residueType}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="quantity">
                      {t('farmer.field.quantity')} <span className="required">*</span>
                    </label>
                    <div className="qty-input-wrap">
                      <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0.1"
                        step="0.5"
                        className={`form-control ${errors.quantity ? 'form-control--error' : ''}`}
                        placeholder={t('farmer.eg', { value: '25' })}
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
                        aria-label={t('farmer.field.unitAria')}
                      >
                        <option value="tonnes">{t('farmer.unit.tonnes')}</option>
                        <option value="quintals">{t('farmer.unit.quintals')}</option>
                        <option value="kg">{t('farmer.unit.kg')}</option>
                      </select>
                    </div>
                    {errors.quantity && <span className="form-error" role="alert">{errors.quantity}</span>}
                    {form.unit !== 'tonnes' && form.quantity > 0 && (
                      <span className="form-hint">
                        {t('farmer.normalizedEquivalent', {
                          quantity: form.unit === 'quintals'
                            ? (Number(form.quantity) / 10).toFixed(2)
                            : (Number(form.quantity) / 1000).toFixed(3),
                          unit: t('farmer.unit.tonnes'),
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section 03: Geographic Coordinates ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">03</span>
                  <div>
                    <h2 className="heading-md">{t('farmer.section.location.title')}</h2>
                    <p className="body-sm text-muted">{t('farmer.section.location.description')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="location">
                      {t('farmer.field.location')} <span className="required">*</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className={`form-control ${errors.location ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.eg', { value: 'Anand' })}
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={300}
                    />
                    {errors.location && <span className="form-error" role="alert">{errors.location}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="district">{t('farmer.field.district')}</label>
                    <input
                      id="district"
                      name="district"
                      type="text"
                      className="form-control"
                      placeholder={t('farmer.eg', { value: 'Anand' })}
                      value={form.district}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="state">
                      {t('farmer.field.state')} <span className="required">*</span>
                    </label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      className={`form-control ${errors.state ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.eg', { value: 'Gujarat' })}
                      value={form.state}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.state && <span className="form-error" role="alert">{errors.state}</span>}
                  </div>
                </div>
              </div>

              {/* ── Section 04: Commercial Terms & Pricing (NEW) ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">04</span>
                  <div>
                    <h2 className="heading-md">{t('farmer.section.commercial.title')}</h2>
                    <p className="body-sm text-muted">{t('farmer.section.commercial.description')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="askingPricePerTonne">
                      {t('farmerAskingPrice')} (₹ / {t('farmer.unit.tonnes')})
                    </label>
                    <input
                      id="askingPricePerTonne"
                      name="askingPricePerTonne"
                      type="number"
                      min="0"
                      step="50"
                      className={`form-control ${errors.askingPricePerTonne ? 'form-control--error' : ''}`}
                      placeholder={`${t('farmer.eg', { value: '2100' })} (${t('farmer.leaveEmptyToNegotiate')})`}
                      value={form.askingPricePerTonne}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.askingPricePerTonne && <span className="form-error" role="alert">{errors.askingPricePerTonne}</span>}
                    <span className="form-hint">{t('farmer.hint.targetPrice')}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="priceCondition">
                      {t('farmer.field.priceCondition')}
                    </label>
                    <select
                      id="priceCondition"
                      name="priceCondition"
                      className="form-control"
                      value={form.priceCondition}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="farm_gate">{t('farmGate')}</option>
                      <option value="ex_warehouse">{t('exWarehouse')}</option>
                      <option value="delivered">{t('delivered')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="residueForm">
                      {t('farmer.field.residueForm')}
                    </label>
                    <select
                      id="residueForm"
                      name="residueForm"
                      className="form-control"
                      value={form.residueForm}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="baled">{t('farmer.residueForm.baled')}</option>
                      <option value="loose">{t('farmer.residueForm.loose')}</option>
                      <option value="shredded">{t('farmer.residueForm.shredded')}</option>
                      <option value="pelletized">{t('farmer.residueForm.pelletized')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="moisturePercent">
                      {t('farmer.field.moisture')}
                    </label>
                    <input
                      id="moisturePercent"
                      name="moisturePercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className={`form-control ${errors.moisturePercent ? 'form-control--error' : ''}`}
                      placeholder={t('farmer.eg', { value: '12' })}
                      value={form.moisturePercent}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.moisturePercent && <span className="form-error" role="alert">{errors.moisturePercent}</span>}
                    <span className="form-hint">{t('farmer.hint.moisture')}</span>
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
                      <span className="body-sm font-medium">{t('farmer.field.negotiable')}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Section 05: Availability & Logistics ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">05</span>
                  <div>
                    <h2 className="heading-md">{t('farmer.section.logistics.title')}</h2>
                    <p className="body-sm text-muted">{t('farmer.section.logistics.description')}</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="availabilityDate">
                      {t('farmer.field.availabilityDate')} <span className="required">*</span>
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
                      {t('farmer.field.pickupPreference')} <span className="required">*</span>
                    </label>
                    <select
                      id="pickupPreference"
                      name="pickupPreference"
                      className={`form-control ${errors.pickupPreference ? 'form-control--error' : ''}`}
                      value={form.pickupPreference}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— {t('farmer.selectPickup')} —</option>
                      {PICKUP_PREFERENCES.map((preference) => (
                        <option key={preference} value={preference}>{t(`pickup.${preference}`)}</option>
                      ))}
                    </select>
                    {errors.pickupPreference && <span className="form-error" role="alert">{errors.pickupPreference}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="notes">
                      {t('farmer.field.notes')}
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      placeholder={t('farmer.eg', { value: '12% moisture' })}
                      value={form.notes}
                      onChange={handleChange}
                      disabled={loading}
                      rows={3}
                      maxLength={1000}
                    />
                    <span className="form-hint">{t('farmer.hint.notes')}</span>
                  </div>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="farmer-form-footer">
                <div className="footer-notice">
                  {requiredNotice[0]}<span className="text-danger">*</span>{requiredNotice[1]}
                </div>
                <div className="flex gap-sm">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    {t('farmer.reset')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <LoadingSpinner label={t('farmer.writingRecord')} /> : t('farmer.submit')}
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
                  {isConfigured ? t('farmer.sidebar.databaseLive') : t('farmer.sidebar.localStandby')}
                </span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured
                  ? t('farmer.sidebar.databaseLiveDescription')
                  : t('farmer.sidebar.localStandbyDescription')}
              </p>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">{t('farmer.sidebar.qualityTitle')}</h3>
              <ul className="sidebar-checklist">
                <li>{t('farmer.sidebar.quality1')}</li>
                <li>{t('farmer.sidebar.quality2')}</li>
                <li>{t('farmer.sidebar.quality3')}</li>
                <li>{t('farmer.sidebar.quality4')}</li>
              </ul>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">{t('farmer.sidebar.workflowTitle')}</h3>
              <ol className="sidebar-steps">
                <li><strong>{t('farmer.sidebar.workflow1Title')}</strong> {t('farmer.sidebar.workflow1')}</li>
                <li><strong>{t('farmer.sidebar.workflow2Title')}</strong> {t('farmer.sidebar.workflow2')}</li>
                <li><strong>{t('farmer.sidebar.workflow3Title')}</strong> {t('farmer.sidebar.workflow3')}</li>
                <li><strong>{t('farmer.sidebar.workflow4Title')}</strong> {t('farmer.sidebar.workflow4')}</li>
              </ol>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
