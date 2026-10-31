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
    if (!form.orgName.trim())
      e.orgName = 'Organisation / name is required';
    if (form.acceptedTypes.length === 0)
      e.acceptedTypes = 'Select at least one residue type';
    if (!form.requiredQuantity || Number(form.requiredQuantity) <= 0)
      e.requiredQuantity = 'Enter a required quantity greater than zero';
    if (form.maxIntake && Number(form.maxIntake) < Number(form.requiredQuantity))
      e.maxIntake = 'Max intake cannot be less than required quantity';
    if (!form.location.trim())
      e.location = 'Facility location is required';
    if (!form.state.trim())
      e.state = 'State is required';
    if (!form.intendedUse)
      e.intendedUse = 'Select intended use';
    if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail))
      e.contactEmail = 'Enter a valid email address';
    if (form.contactPhone && !/^[0-9+\s()-]{7,15}$/.test(form.contactPhone.trim()))
      e.contactPhone = 'Enter a valid phone number';
    if (form.offeredPricePerTonne !== '' && Number(form.offeredPricePerTonne) < 0)
      e.offeredPricePerTonne = 'Offered price cannot be negative';
    if (form.maxAcceptableMoisture !== '' && (Number(form.maxAcceptableMoisture) < 0 || Number(form.maxAcceptableMoisture) > 100))
      e.maxAcceptableMoisture = 'Moisture must be between 0% and 100%';
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
          ? prev.acceptedTypes.filter((t) => t !== type)
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
      setDbError('An unexpected error occurred. Please try again.');
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
            <span className="section-eyebrow">Enterprise Sourcing Protocol</span>
            <SplitText text="Demand Profile Registered" tag="h1" className="display-lg" delay={0.03} />
            <p className="body-md text-muted mt-xs">
              Your feedstock procurement criteria are now indexed for nearby farmer cluster matching.
            </p>
          </div>
        </header>

        <div className="container section-sm">
          <FadeContent delay={0.1} distance={20} className="buyer-success reveal is-visible">
            <div className="success-banner-box">
              <div className="success-badge">
                <span className="success-dot" />
                <span>Demand Profile Registered</span>
              </div>
              <h2 className="heading-lg mt-xs">
                {savedRecord ? 'Record Committed to Database' : 'Demand Profile Stored in Local Session'}
              </h2>
              <p className="body-md text-muted mt-xs">
                {savedRecord
                  ? <>Reference Identifier: <code className="record-id">{savedRecord.id}</code>. Farming clusters within haulage radius can now view matching inquiries.</>
                  : `Requirement criteria recorded. Farming clusters near ${form.location} will be ranked against your intake capacity.`}
              </p>
            </div>

            <div className="buyer-success__summary card">
              <div className="summary-header">
                <h3 className="heading-md">Registered Feedstock Profile</h3>
                <span className="badge badge-green">Intake Mode: Active</span>
              </div>
              <div className="spec-table-grid">
                <div className="spec-item">
                  <span className="label">Enterprise</span>
                  <div className="spec-val font-semibold">{form.orgName}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Purchasing Purpose</span>
                  <div className="spec-val font-semibold text-forest">{form.purchasingPurpose}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Facility Location</span>
                  <div className="spec-val">{form.location}, {form.state}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Target Batch Volume</span>
                  <div className="spec-val font-semibold text-forest">{form.requiredQuantity} tonnes</div>
                </div>
                <div className="spec-item">
                  <span className="label">Offered Purchase Rate</span>
                  <div className="spec-val font-semibold text-forest">
                    {form.offeredPricePerTonne ? `₹${Number(form.offeredPricePerTonne).toLocaleString('en-IN')} / tonne` : 'Open to quote'}
                    {` (${form.deliveryTermPreference.replace('_', ' ')})`}
                  </div>
                </div>
                <div className="spec-item">
                  <span className="label">Form &amp; Max Moisture</span>
                  <div className="spec-val">
                    {form.preferredResidueForm.toUpperCase()} {form.maxAcceptableMoisture ? `| Max ${form.maxAcceptableMoisture}%` : ''}
                  </div>
                </div>
              </div>

              <div className="mt-lg pt-md" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <span className="label">Accepted Crop Residue Species</span>
                <div className="tag-list mt-xs">
                  {form.acceptedTypes.map((t) => (
                    <span key={t} className="badge badge-green">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="buyer-success__actions">
              <button onClick={() => navigate('/matches')} className="btn btn-primary btn-lg">
                Inspect Available Farm Supply
              </button>
              <button onClick={() => navigate('/market-intelligence')} className="btn btn-secondary btn-lg">
                View Market Intelligence
              </button>
              <button onClick={handleReset} className="btn btn-outline">
                Register Additional Spec
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
            <span className="section-eyebrow">Enterprise Sourcing Protocol</span>
            <SplitText text="Register Feedstock Demand" tag="h1" className="display-lg" delay={0.03} />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '600px' }}>
              Define industrial intake requirements, residue varieties, commercial rate offers, and logistics preferences
              to source consistent raw biomass directly from verified farming cooperatives.
            </p>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        <div className="buyer-layout">
          <FadeContent delay={0.1} distance={20} className="buyer-form-wrap">
            {!isConfigured && <DbSetupBanner />}
            {dbError && <DbErrorAlert message={dbError} onRetry={() => setDbError(null)} />}

            <form onSubmit={handleSubmit} noValidate aria-label="Buyer demand registration form">
              {/* ── Section 01: Enterprise Details ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">01</span>
                  <div>
                    <h2 className="heading-md">Enterprise Information</h2>
                    <p className="body-sm text-muted">Legal entity and procurement authorization.</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="orgName">
                      Organisation / Facility Name <span className="required">*</span>
                    </label>
                    <input
                      id="orgName"
                      name="orgName"
                      type="text"
                      className={`form-control ${errors.orgName ? 'form-control--error' : ''}`}
                      placeholder="e.g. GreenFuel Renewables Ltd."
                      value={form.orgName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={150}
                    />
                    {errors.orgName && <span className="form-error" role="alert">{errors.orgName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="orgType">Organisation Type</label>
                    <select
                      id="orgType"
                      name="orgType"
                      className="form-control"
                      value={form.orgType}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— Select Entity Structure —</option>
                      {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPerson">Procurement Officer / Contact</label>
                    <input
                      id="contactPerson"
                      name="contactPerson"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Vikram Sharma"
                      value={form.contactPerson}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPhone">Contact Phone</label>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      className={`form-control ${errors.contactPhone ? 'form-control--error' : ''}`}
                      placeholder="e.g. 98765 43210"
                      value={form.contactPhone}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={20}
                    />
                    {errors.contactPhone && <span className="form-error" role="alert">{errors.contactPhone}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="contactEmail">Corporate Procurement Email</label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder="e.g. procurement@greenfuel.in"
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
                    <h2 className="heading-md">Target Biomass Varieties</h2>
                    <p className="body-sm text-muted">Select all residue types compatible with your boiler or processing equipment.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Acceptable Crop Species <span className="required">*</span>
                  </label>
                  <div className="residue-checkbox-grid" role="group" aria-label="Accepted Residue Types">
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
                          {type}
                        </button>
                      );
                    })}
                  </div>
                  {errors.acceptedTypes && (
                    <span className="form-error mt-xs" role="alert">{errors.acceptedTypes}</span>
                  )}
                  <span className="form-hint mt-xs">
                    Selected: {form.acceptedTypes.length} variety(s) indexed for matching.
                  </span>
                </div>
              </div>

              {/* ── Section 03: Intake Capacities & Transformation ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">03</span>
                  <div>
                    <h2 className="heading-md">Tonnage &amp; Industrial Transformation</h2>
                    <p className="body-sm text-muted">Required delivery lot size and targeted end product.</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="requiredQuantity">
                      Minimum Batch Volume (Tonnes) <span className="required">*</span>
                    </label>
                    <input
                      id="requiredQuantity"
                      name="requiredQuantity"
                      type="number"
                      min="1"
                      className={`form-control ${errors.requiredQuantity ? 'form-control--error' : ''}`}
                      placeholder="e.g. 50"
                      value={form.requiredQuantity}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.requiredQuantity && <span className="form-error" role="alert">{errors.requiredQuantity}</span>}
                    <span className="form-hint">Minimum lot size required to initiate haulage dispatch.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="maxIntake">
                      Max Yard Intake Capacity (Tonnes / Month)
                    </label>
                    <input
                      id="maxIntake"
                      name="maxIntake"
                      type="number"
                      min="1"
                      className={`form-control ${errors.maxIntake ? 'form-control--error' : ''}`}
                      placeholder="e.g. 500"
                      value={form.maxIntake}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.maxIntake && <span className="form-error" role="alert">{errors.maxIntake}</span>}
                    <span className="form-hint">Prevents matching algorithm from oversaturating yard capacity.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="intendedUse">
                      Industrial End-Use <span className="required">*</span>
                    </label>
                    <select
                      id="intendedUse"
                      name="intendedUse"
                      className={`form-control ${errors.intendedUse ? 'form-control--error' : ''}`}
                      value={form.intendedUse}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— Select Target Application —</option>
                      {INTENDED_USES.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    {errors.intendedUse && <span className="form-error" role="alert">{errors.intendedUse}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="available">Current Intake Status</label>
                    <select
                      id="available"
                      name="available"
                      className="form-control"
                      value={form.available}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="yes">Accepting Active Deliveries</option>
                      <option value="limited">Limited Yard Space</option>
                      <option value="no">Temporarily On Standby</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Section 04: Commercial Terms & Purchasing Purpose (NEW) ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">04</span>
                  <div>
                    <h2 className="heading-md">Commercial Terms &amp; Purchasing Purpose</h2>
                    <p className="body-sm text-muted">Define offered purchase rate, purchasing purpose and feedstock quality constraints.</p>
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
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <span className="form-hint">Displayed in smart match cards for producer evaluation.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="offeredPricePerTonne">
                      {t('buyerOfferedPrice')} (₹ / tonne)
                    </label>
                    <input
                      id="offeredPricePerTonne"
                      name="offeredPricePerTonne"
                      type="number"
                      min="0"
                      step="50"
                      className={`form-control ${errors.offeredPricePerTonne ? 'form-control--error' : ''}`}
                      placeholder="e.g. 2300 (Leave empty for open quotes)"
                      value={form.offeredPricePerTonne}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.offeredPricePerTonne && <span className="form-error" role="alert">{errors.offeredPricePerTonne}</span>}
                    <span className="form-hint">Procurement budget per metric tonne.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="deliveryTermPreference">
                      Delivery Term Preference
                    </label>
                    <select
                      id="deliveryTermPreference"
                      name="deliveryTermPreference"
                      className="form-control"
                      value={form.deliveryTermPreference}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="delivered">{t('delivered')} (Delivered to Facility)</option>
                      <option value="farm_gate">{t('farmGate')} (Buyer arranges pickup)</option>
                      <option value="ex_warehouse">{t('exWarehouse')} (Ex-Warehouse Collection)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="preferredResidueForm">
                      Preferred Residue Form
                    </label>
                    <select
                      id="preferredResidueForm"
                      name="preferredResidueForm"
                      className="form-control"
                      value={form.preferredResidueForm}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="baled">Baled (Square / Round Bales)</option>
                      <option value="loose">Loose Biomass</option>
                      <option value="shredded">Shredded / Chopped Straw</option>
                      <option value="pelletized">Pelletized / Briquetted</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="maxAcceptableMoisture">
                      Max Acceptable Moisture (%)
                    </label>
                    <input
                      id="maxAcceptableMoisture"
                      name="maxAcceptableMoisture"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className={`form-control ${errors.maxAcceptableMoisture ? 'form-control--error' : ''}`}
                      placeholder="e.g. 16"
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
                      <span className="body-sm font-medium">Offered rate is open to negotiation based on haulage distance and quality specs</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Section 05: Facility Location ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">05</span>
                  <div>
                    <h2 className="heading-md">Facility Yard Location</h2>
                    <p className="body-sm text-muted">Intake terminal coordinates for road haulage calculation.</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="location">
                      City / Industrial Area <span className="required">*</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className={`form-control ${errors.location ? 'form-control--error' : ''}`}
                      placeholder="e.g. Panipat Industrial Area"
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.location && <span className="form-error" role="alert">{errors.location}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="state">
                      State <span className="required">*</span>
                    </label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      className={`form-control ${errors.state ? 'form-control--error' : ''}`}
                      placeholder="e.g. Haryana"
                      value={form.state}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.state && <span className="form-error" role="alert">{errors.state}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="notes">Intake Specifications &amp; Unloading Constraints</label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      placeholder="e.g. Weighbridge available up to 40T, hydraulic unloader on site, gate timings 08:00 to 18:00..."
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
                  Fields marked <span className="text-danger">*</span> are required for matching.
                </div>
                <div className="flex gap-sm">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    Reset Form
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <LoadingSpinner label="Writing requirement…" /> : 'Index Sourcing Demand'}
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
                <span className="heading-sm">{isConfigured ? 'Live Database Active' : 'Session Memory Engine'}</span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured
                  ? 'Requirements persist across user sessions and trigger automated matching against new farmer listings.'
                  : 'Demonstration mode active. Intake criteria are scored instantly in local memory.'}
              </p>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">Industrial Feedstock Guidelines</h3>
              <ul className="sidebar-checklist">
                <li>Specify max intake volume to avoid haulage bottlenecks.</li>
                <li>State purchase rate in ₹/tonne for instant commercial feasibility assessment.</li>
                <li>Multiple accepted varieties increase match rate by up to 300%.</li>
                <li>Detail weighbridge and unloading facilities in intake notes.</li>
              </ul>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
