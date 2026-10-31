import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RESIDUE_TYPES, PICKUP_PREFERENCES } from '../data/sampleData';
import { createFarmerListing, formatDbError } from '../lib/db';
import { isConfigured } from '../lib/supabase';
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
    if (!form.farmerName.trim())
      e.farmerName = 'Name is required';
    if (!form.residueType)
      e.residueType = 'Select a residue type';
    if (!form.quantity || Number(form.quantity) <= 0)
      e.quantity = 'Enter a valid quantity greater than zero';
    if (Number(form.quantity) > 100000)
      e.quantity = 'Quantity seems unrealistically large — please double-check';
    if (!form.location.trim())
      e.location = 'Village/farm location is required';
    if (!form.state.trim())
      e.state = 'State is required';
    if (!form.availabilityDate)
      e.availabilityDate = 'Pick an availability date';
    if (!form.pickupPreference)
      e.pickupPreference = 'Select a pickup preference';
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
    const displayQty = savedRecord
      ? `${savedRecord.quantity_tonnes} tonnes (stored in database)`
      : `${form.quantity} ${form.unit}`;

    return (
      <main className="farmer-page">
        <header className="page-header">
          <div className="container">
            <span className="section-eyebrow">Producer Registration Protocol</span>
            <SplitText text="Listing Successfully Registered" tag="h1" className="display-lg" delay={0.03} />
            <p className="body-md text-muted mt-xs">
              Your agricultural residue lot has been registered into the active matching pool.
            </p>
          </div>
        </header>

        <div className="container section-sm">
          <FadeContent delay={0.1} distance={20} className="farmer-success reveal is-visible">
            <div className="success-banner-box">
              <div className="success-badge">
                <span className="success-dot" />
                <span>Verified Listing Confirmation</span>
              </div>
              <h2 className="heading-lg mt-xs">
                {savedRecord ? 'Record Committed to PostgreSQL Database' : 'Listing Recorded in Session Memory'}
              </h2>
              <p className="body-md text-muted mt-xs">
                {savedRecord
                  ? <>Reference Identifier: <code className="record-id">{savedRecord.id}</code>. Nearby verified buyers can now discover your lot.</>
                  : 'Listing stored in local session. Connect Supabase credentials in .env.local to persist across multi-node workers.'}
              </p>
            </div>

            <div className="farmer-success__summary card">
              <div className="summary-header">
                <h3 className="heading-md">Registered Lot Specifications</h3>
                <span className="badge badge-green">Status: {savedRecord?.status || 'Active'}</span>
              </div>
              <div className="spec-table-grid">
                <div className="spec-item">
                  <span className="label">Producer / Contact</span>
                  <div className="spec-val">{form.farmerName}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Residue Species</span>
                  <div className="spec-val text-forest font-semibold">{form.residueType}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Batch Volume</span>
                  <div className="spec-val font-semibold">{displayQty}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Location & District</span>
                  <div className="spec-val">{form.location}{form.state ? `, ${form.state}` : ''}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Earliest Availability</span>
                  <div className="spec-val">{form.availabilityDate}</div>
                </div>
                <div className="spec-item">
                  <span className="label">Haulage Preference</span>
                  <div className="spec-val">{form.pickupPreference}</div>
                </div>
              </div>
            </div>

            <div className="farmer-success__actions">
              <button
                onClick={() => navigate(savedRecord?.id ? `/matches?listing=${savedRecord.id}` : '/matches')}
                className="btn btn-primary btn-lg"
              >
                Inspect Buyer Matches
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-lg">
                View Dashboard
              </button>
              <button onClick={handleReset} className="btn btn-outline">
                Submit Additional Lot
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
            <span className="section-eyebrow">Producer Registration Protocol</span>
            <SplitText text="List Agricultural Residue" tag="h1" className="display-lg" delay={0.03} />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '600px' }}>
              Register surplus harvest biomass into India’s national circular network.
              The algorithmic matching engine evaluates nearby bio-CNG, paper, and industrial buyers.
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

            <form onSubmit={handleSubmit} noValidate aria-label="Residue listing form">
              {/* ── Section 01: Producer Information ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">01</span>
                  <div>
                    <h2 className="heading-md">Producer &amp; Point of Contact</h2>
                    <p className="body-sm text-muted">Primary entity identification for logistics coordination.</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="farmerName">
                      Producer / FPO Name <span className="required">*</span>
                    </label>
                    <input
                      id="farmerName"
                      name="farmerName"
                      type="text"
                      className={`form-control ${errors.farmerName ? 'form-control--error' : ''}`}
                      placeholder="e.g. Rajesh Patel or Anand FPO Cluster"
                      value={form.farmerName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.farmerName && <span className="form-error" role="alert">{errors.farmerName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPhone">
                      Contact Phone
                    </label>
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
                    <label className="form-label" htmlFor="contactEmail">
                      Email Address (Optional)
                    </label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder="e.g. contact@cooperative.in"
                      value={form.contactEmail}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.contactEmail && <span className="form-error" role="alert">{errors.contactEmail}</span>}
                    <span className="form-hint">Used strictly for automated pickup confirmation notices.</span>
                  </div>
                </div>
              </div>

              {/* ── Section 02: Residue Specifications ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">02</span>
                  <div>
                    <h2 className="heading-md">Residue Specifications</h2>
                    <p className="body-sm text-muted">Crop species, available tonnage, and batch volume.</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="residueType">
                      Crop Residue Type <span className="required">*</span>
                    </label>
                    <select
                      id="residueType"
                      name="residueType"
                      className={`form-control ${errors.residueType ? 'form-control--error' : ''}`}
                      value={form.residueType}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— Select Crop Species —</option>
                      {RESIDUE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors.residueType && <span className="form-error" role="alert">{errors.residueType}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="quantity">
                      Estimated Lot Quantity <span className="required">*</span>
                    </label>
                    <div className="qty-input-wrap">
                      <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0.1"
                        step="0.5"
                        className={`form-control ${errors.quantity ? 'form-control--error' : ''}`}
                        placeholder="e.g. 25"
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
                        <option value="tonnes">tonnes</option>
                        <option value="quintals">quintals</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                    {errors.quantity && <span className="form-error" role="alert">{errors.quantity}</span>}
                    {form.unit !== 'tonnes' && form.quantity > 0 && (
                      <span className="form-hint">
                        Normalized equivalent: {form.unit === 'quintals'
                          ? (Number(form.quantity) / 10).toFixed(2)
                          : (Number(form.quantity) / 1000).toFixed(3)} tonnes stored in database.
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
                    <h2 className="heading-md">Field Location &amp; Regional Cluster</h2>
                    <p className="body-sm text-muted">Geographic data feeds the proximity and road-routing algorithm.</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="location">
                      Farm / Village Location <span className="required">*</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className={`form-control ${errors.location ? 'form-control--error' : ''}`}
                      placeholder="e.g. Khambhat village, Anand district"
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={300}
                    />
                    {errors.location && <span className="form-error" role="alert">{errors.location}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="district">District</label>
                    <input
                      id="district"
                      name="district"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Anand"
                      value={form.district}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
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
                </div>
              </div>

              {/* ── Section 04: Availability & Logistics ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">04</span>
                  <div>
                    <h2 className="heading-md">Availability Window &amp; Haulage Mode</h2>
                    <p className="body-sm text-muted">Field clearance timeline and preferred loading protocol.</p>
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="availabilityDate">
                      Earliest Harvest Window <span className="required">*</span>
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
                      Haulage / Pickup Preference <span className="required">*</span>
                    </label>
                    <select
                      id="pickupPreference"
                      name="pickupPreference"
                      className={`form-control ${errors.pickupPreference ? 'form-control--error' : ''}`}
                      value={form.pickupPreference}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— Select Pickup Mode —</option>
                      {PICKUP_PREFERENCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {errors.pickupPreference && <span className="form-error" role="alert">{errors.pickupPreference}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="notes">
                      Logistics Notes &amp; Baling Condition
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      placeholder="e.g. Moisture ~12%, road accessible for 16-wheel transport, baling machine available..."
                      value={form.notes}
                      onChange={handleChange}
                      disabled={loading}
                      rows={3}
                      maxLength={1000}
                    />
                    <span className="form-hint">Details regarding baling, road clearance, or tractor loading.</span>
                  </div>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="farmer-form-footer">
                <div className="footer-notice">
                  Fields marked <span className="text-danger">*</span> are required for algorithm matching.
                </div>
                <div className="flex gap-sm">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    Reset Form
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <LoadingSpinner label="Writing record…" /> : 'Submit Farm Listing'}
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
                  {isConfigured ? 'Live Database Active' : 'Local Standby Engine'}
                </span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured
                  ? 'Active listings automatically sync with the live matching engine and persistent Supabase database.'
                  : 'Demonstration environment. Submissions populate local memory and matching algorithms.'}
              </p>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">Listing Quality Standards</h3>
              <ul className="sidebar-checklist">
                <li>Specify verified crop variety to optimize calorific mapping.</li>
                <li>Report realistic dry-matter weights for accurate logistics sizing.</li>
                <li>Include nearest arterial highway or landmark in location notes.</li>
                <li>Align harvest date with required field turnaround schedules.</li>
              </ul>
            </div>

            <div className="sidebar-card mt-lg">
              <h3 className="heading-sm mb-sm">System Workflow</h3>
              <ol className="sidebar-steps">
                <li><strong>1. Lot Registration:</strong> Batch profile enters deterministic index.</li>
                <li><strong>2. Algorithmic Ranking:</strong> Proximity &amp; volume fit scored on 100 pt scale.</li>
                <li><strong>3. Direct Inquiries:</strong> Industrial buyers initiate transport requests.</li>
                <li><strong>4. Clearance:</strong> Residue dispatched with verifiable audit trail.</li>
              </ol>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
