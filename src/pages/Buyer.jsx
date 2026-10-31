// src/pages/Buyer.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RESIDUE_TYPES, INTENDED_USES } from '../data/sampleData';
import { createBuyerRequirement, formatDbError } from '../lib/db';
import { isConfigured } from '../lib/supabase';
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
  const navigate = useNavigate();
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
                  <span className="label">Facility Location</span>
                  <div className="spec-val">{form.location}, {form.state}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Target Batch Volume</span>
                  <div className="spec-val font-semibold text-forest">{form.requiredQuantity} tonnes</div>
                </div>
                <div className="spec-item">
                  <span className="label">Yard Intake Limit</span>
                  <div className="spec-val">{form.maxIntake ? `${form.maxIntake} tonnes` : 'Flexible Capacity'}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Target Transformation</span>
                  <div className="spec-val">{form.intendedUse}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Intake Availability</span>
                  <div className="spec-val">
                    {form.available === 'yes' ? 'Accepting Supply'
                     : form.available === 'limited' ? 'Limited Capacity'
                     : 'Intake on Standby'}
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
              <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-lg">
                View Sourcing Dashboard
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
              Define industrial intake requirements, residue varieties, and logistics preferences
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
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="orgName">
                      Organisation / Facility Name <span className="required">*</span>
                    </label>
                    <input
                      id="orgName"
                      name="orgName"
                      type="text"
                      className={`form-control ${errors.orgName ? 'form-control--error' : ''}`}
                      placeholder="e.g. GreenFuel Bio-Energy Pvt. Ltd."
                      value={form.orgName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.orgName && <span className="form-error" role="alert">{errors.orgName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="orgType">Entity Structure</label>
                    <select
                      id="orgType"
                      name="orgType"
                      className="form-control"
                      value={form.orgType}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— Select Category —</option>
                      {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPerson">Procurement Officer</label>
                    <input
                      id="contactPerson"
                      name="contactPerson"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Priya Sharma"
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

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactEmail">Official Email</label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder="procurement@facility.in"
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
                  <span className="form-section-num">02</span>
                  <div>
                    <h2 className="heading-md">Accepted Feedstock Varieties</h2>
                    <p className="body-sm text-muted">Select all agricultural residue types your facility processes.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Residue Types <span className="required">*</span>
                  </label>
                  <div className="residue-type-grid" role="group" aria-label="Select residue types">
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

              {/* ── Section 04: Facility Location ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">04</span>
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
                      placeholder="e.g. Weighbridge on site, 24/7 weighment available, maximum permissible moisture 14%..."
                      value={form.notes}
                      onChange={handleChange}
                      disabled={loading}
                      rows={3}
                      maxLength={1000}
                    />
                    <span className="form-hint">Moisture tolerances, weighbridge limits, or offloading hours.</span>
                  </div>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="buyer-form-footer">
                <div className="footer-notice">
                  Fields marked <span className="text-danger">*</span> are required for algorithm matching.
                </div>
                <div className="flex gap-sm">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    Reset Form
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <LoadingSpinner label="Writing record…" /> : 'Register Demand Criteria'}
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
                  {isConfigured ? 'Live Database Active' : 'Local Standby Engine'}
                </span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured
                  ? 'Buyer requirements are actively queried by incoming farm listings across regional supply hubs.'
                  : 'Demonstration environment. Submissions populate local memory and matching algorithms.'}
              </p>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">Sourcing Best Practices</h3>
              <ul className="sidebar-checklist">
                <li>Specify max intake to avoid sudden over-commitment of storage yards.</li>
                <li>Multiple residue types improve aggregation rate across mixed crop regions.</li>
                <li>Include clear weighbridge and moisture criteria in facility notes.</li>
                <li>Maintain active status to appear in top algorithm recommendations.</li>
              </ul>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">Automated Aggregation</h3>
              <p className="body-sm text-muted">
                When a single farm cannot fulfill your minimum batch size, our clustering algorithm
                groups compatible listings within a 25 km radius into a consolidated freight delivery.
              </p>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
