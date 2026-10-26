// src/pages/Buyer.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RESIDUE_TYPES, INTENDED_USES } from '../data/sampleData';
import { createBuyerRequirement, formatDbError } from '../lib/db';
import { isConfigured } from '../lib/supabase';
import { DbSetupBanner, DbErrorAlert, LoadingSpinner } from '../components/DbStatus';
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
        <div className="page-hero buyer-hero">
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div className="section-eyebrow" style={{ color: 'var(--color-tan)', background: 'rgba(212,169,106,0.15)', display: 'inline-block' }}>
              Buyer Portal
            </div>
            <h1 className="display-lg text-white mt-md">Register Residue Demand</h1>
          </div>
        </div>
        <div className="container">
          <div className="buyer-success animate-fadeUp">
            <div className="buyer-success__icon">🎊</div>
            <h2 className="display-md text-forest">Demand Registered!</h2>
            <p className="body-lg text-muted">
              {savedRecord
                ? <>Your demand profile has been <strong>saved to the database</strong> (ID: <code className="record-id">{savedRecord.id}</code>). Farmers with matching residue near {form.location} can now find you.</>
                : `Your demand profile was recorded. Farmers with matching residue near ${form.location} will be notified.`}
            </p>
            <div className="buyer-success__summary card">
              <h3 className="heading-md mb-md">Your Demand Profile</h3>
              <div className="form-grid form-grid-2">
                <div><span className="label text-muted">Organisation</span><p className="heading-sm mt-sm">{form.orgName}</p></div>
                <div><span className="label text-muted">Location</span><p className="heading-sm mt-sm">{form.location}, {form.state}</p></div>
                <div><span className="label text-muted">Required Qty</span><p className="heading-sm mt-sm">{form.requiredQuantity} tonnes</p></div>
                <div><span className="label text-muted">Max Intake</span><p className="heading-sm mt-sm">{form.maxIntake || 'Not specified'} tonnes/month</p></div>
                <div><span className="label text-muted">Intended Use</span><p className="heading-sm mt-sm">{form.intendedUse}</p></div>
                <div><span className="label text-muted">Status</span>
                  <p className="heading-sm mt-sm">
                    {form.available === 'yes' ? '✅ Currently accepting'
                     : form.available === 'limited' ? '⚡ Limited capacity'
                     : '⏸ On hold'}
                  </p>
                </div>
              </div>
              <div className="mt-lg">
                <span className="label text-muted">Accepted Residue Types</span>
                <div className="tag-list mt-sm">
                  {form.acceptedTypes.map((t) => (
                    <span key={t} className="badge badge-green">{t}</span>
                  ))}
                </div>
              </div>
              {savedRecord && (
                <div className="mt-md">
                  <span className="badge badge-green">✓ Persisted in Supabase</span>
                </div>
              )}
            </div>
            <div className="buyer-success__actions">
              <button onClick={() => navigate('/matches')} className="btn btn-primary btn-lg">
                Browse Matches →
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                Go to Dashboard
              </button>
              <button onClick={handleReset} className="btn btn-outline">
                Register Another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Main form ─────────────────────────────────────────────────
  return (
    <main className="buyer-page">
      <div className="page-hero buyer-hero">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-eyebrow" style={{ color: 'var(--color-tan)', background: 'rgba(212,169,106,0.15)', display: 'inline-block' }}>
            Buyer Portal
          </div>
          <h1 className="display-lg text-white mt-md">Register Residue Demand</h1>
          <p className="body-lg mt-md" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '520px' }}>
            Tell us what agricultural residue you need, and we'll match you with farmers
            who have it available near your facility.
          </p>
        </div>
      </div>

      <div className="container section-sm">
        <div className="buyer-layout">
          <div className="buyer-form-wrap">

            {!isConfigured && <DbSetupBanner />}
            {dbError && <DbErrorAlert message={dbError} onRetry={() => setDbError(null)} />}

            <form onSubmit={handleSubmit} noValidate aria-label="Buyer demand registration form">

              {/* ── Section 01: Organisation ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num buyer-num">01</span>
                  <div>
                    <h2 className="heading-lg">Organisation Details</h2>
                    <p className="body-sm text-muted">Tell us about your company or organisation.</p>
                  </div>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="orgName">
                      Organisation / Individual Name <span className="required">*</span>
                    </label>
                    <input
                      id="orgName"
                      name="orgName"
                      type="text"
                      className={`form-control ${errors.orgName ? 'form-control--error' : ''}`}
                      placeholder="e.g. GreenFuel Renewables Pvt. Ltd."
                      value={form.orgName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.orgName && <span className="form-error" role="alert">{errors.orgName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="orgType">Organisation Type</label>
                    <select id="orgType" name="orgType" className="form-control" value={form.orgType} onChange={handleChange} disabled={loading}>
                      <option value="">— Select type —</option>
                      {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPerson">Contact Person</label>
                    <input
                      id="contactPerson"
                      name="contactPerson"
                      type="text"
                      className="form-control"
                      placeholder="Procurement / Supply Manager"
                      value={form.contactPerson}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contactEmail">Email Address</label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder="procurement@company.com"
                      value={form.contactEmail}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.contactEmail && <span className="form-error" role="alert">{errors.contactEmail}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPhone">Phone Number</label>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      className={`form-control ${errors.contactPhone ? 'form-control--error' : ''}`}
                      placeholder="+91 98765 43210"
                      value={form.contactPhone}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={20}
                    />
                    {errors.contactPhone && <span className="form-error" role="alert">{errors.contactPhone}</span>}
                  </div>
                </div>
              </div>

              {/* ── Section 02: Residue Requirements ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num buyer-num">02</span>
                  <div>
                    <h2 className="heading-lg">Residue Requirements</h2>
                    <p className="body-sm text-muted">What residue types do you need and in what quantities?</p>
                  </div>
                </div>

                <div className="form-group mb-lg">
                  <label className="form-label" id="acceptedTypes-label">
                    Accepted Residue Types <span className="required">*</span>
                  </label>
                  <p className="form-hint mb-md">Select all types your facility can process</p>
                  <div
                    className="residue-type-grid"
                    role="group"
                    aria-labelledby="acceptedTypes-label"
                    id="acceptedTypes"
                  >
                    {RESIDUE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`residue-type-btn ${form.acceptedTypes.includes(type) ? 'active' : ''}`}
                        onClick={() => toggleResidueType(type)}
                        aria-pressed={form.acceptedTypes.includes(type)}
                        disabled={loading}
                      >
                        {form.acceptedTypes.includes(type) ? '✓ ' : ''}{type}
                      </button>
                    ))}
                  </div>
                  {errors.acceptedTypes && <span className="form-error" role="alert">{errors.acceptedTypes}</span>}
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="requiredQuantity">
                      Required Quantity (tonnes/cycle) <span className="required">*</span>
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
                    <span className="form-hint">Stored in tonnes in the database</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="maxIntake">
                      Maximum Intake Capacity (tonnes/month)
                    </label>
                    <input
                      id="maxIntake"
                      name="maxIntake"
                      type="number"
                      min="1"
                      className={`form-control ${errors.maxIntake ? 'form-control--error' : ''}`}
                      placeholder="e.g. 200"
                      value={form.maxIntake}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {errors.maxIntake && <span className="form-error" role="alert">{errors.maxIntake}</span>}
                    <span className="form-hint">Maximum your facility can handle per month</span>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="intendedUse">
                      Intended Use <span className="required">*</span>
                    </label>
                    <select
                      id="intendedUse"
                      name="intendedUse"
                      className={`form-control ${errors.intendedUse ? 'form-control--error' : ''}`}
                      value={form.intendedUse}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— How will you use the residue? —</option>
                      {INTENDED_USES.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    {errors.intendedUse && <span className="form-error" role="alert">{errors.intendedUse}</span>}
                  </div>
                </div>
              </div>

              {/* ── Section 03: Location & Availability ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num buyer-num">03</span>
                  <div>
                    <h2 className="heading-lg">Location &amp; Current Availability</h2>
                    <p className="body-sm text-muted">Where is your facility and are you currently accepting?</p>
                  </div>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="location">
                      Facility Location <span className="required">*</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className={`form-control ${errors.location ? 'form-control--error' : ''}`}
                      placeholder="e.g. Vadodara Industrial Estate, near NH-48"
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={300}
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
                      placeholder="e.g. Gujarat"
                      value={form.state}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.state && <span className="form-error" role="alert">{errors.state}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="available">Current Availability</label>
                    <select
                      id="available"
                      name="available"
                      className="form-control"
                      value={form.available}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="yes">✅ Currently accepting residue</option>
                      <option value="no">⏸ Not accepting at the moment</option>
                      <option value="limited">⚡ Limited capacity available</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="notes">Additional Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      placeholder="Quality specifications, moisture content, storage conditions, contract terms..."
                      value={form.notes}
                      onChange={handleChange}
                      disabled={loading}
                      rows={3}
                      maxLength={1000}
                    />
                    <span className="form-hint">Optional — specify quality requirements or special conditions</span>
                  </div>
                </div>
              </div>

              {/* ── Access limitation notice ── */}
              <div className="alert alert-info mb-lg">
                <span>ℹ️</span>
                <p className="body-sm">
                  <strong>No authentication in this demo.</strong> All submitted buyer profiles are
                  publicly readable. Records from all users appear in the dashboard together.
                  Do not submit real sensitive business information.
                </p>
              </div>

              {/* ── Submit ── */}
              <div className="farmer-form-footer">
                <p className="body-sm text-muted">
                  Fields marked <span style={{ color: 'var(--color-clay)' }}>*</span> are required.
                </p>
                <div className="flex gap-md">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    Reset
                  </button>
                  <button type="submit" className="btn btn-warm btn-lg" disabled={loading}>
                    {loading
                      ? <LoadingSpinner label="Saving to database…" />
                      : 'Register Demand →'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ── Sidebar ── */}
          <aside className="buyer-sidebar">
            <div className={`card buyer-tip-card db-indicator ${isConfigured ? 'db-indicator--connected' : 'db-indicator--offline'}`}>
              <div className="flex items-center gap-sm mb-sm">
                <span className="db-dot" />
                <span className="heading-sm">{isConfigured ? 'Database connected' : 'Database not connected'}</span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured
                  ? 'Demand profiles are saved to Supabase and persist between sessions.'
                  : 'Profiles will not be saved. Configure Supabase to enable persistence.'}
              </p>
            </div>
            <div className="card buyer-tip-card mt-lg">
              <h3 className="heading-md mb-md">🏭 Who should register?</h3>
              <ul className="farmer-tips">
                <li>Bioenergy / biogas plants needing feedstock</li>
                <li>Compost and organic fertiliser producers</li>
                <li>Mushroom cultivation farms using straw substrate</li>
                <li>Paper &amp; pulp mills replacing wood fibre</li>
                <li>Animal feed processors and fodder units</li>
                <li>Research institutions studying residue utilisation</li>
              </ul>
            </div>
            <div className="card buyer-tip-card mt-lg">
              <h3 className="heading-md mb-md">📍 Proximity Matching</h3>
              <p className="body-sm text-muted" style={{ lineHeight: '1.7' }}>
                Our matching algorithm prioritises farmers within a reasonable distance of your
                facility to minimise transport costs and carbon footprint.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
