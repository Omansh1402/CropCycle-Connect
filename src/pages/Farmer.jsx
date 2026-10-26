import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RESIDUE_TYPES, PICKUP_PREFERENCES } from '../data/sampleData';
import { createFarmerListing, formatDbError } from '../lib/db';
import { isConfigured } from '../lib/supabase';
import { DbSetupBanner, DbErrorAlert, LoadingSpinner } from '../components/DbStatus';
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
    // Clear field-level error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    // Clear global DB error when user edits anything
    if (dbError) setDbError(null);
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setDbError(null);

    // Client-side validation first
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
        setDbError(formatDbError(error));
        // Scroll to the error message
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
        <div className="page-hero">
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div className="section-eyebrow" style={{ color: 'var(--color-mint)' }}>Farmer Portal</div>
            <h1 className="display-lg text-white mt-md">List Crop Residue</h1>
          </div>
        </div>
        <div className="container">
          <div className="farmer-success animate-fadeUp">
            <div className="farmer-success__icon">🎉</div>
            <h2 className="display-md text-forest">Listing Saved!</h2>
            <p className="body-lg text-muted">
              {savedRecord
                ? <>Your residue listing has been <strong>saved to the database</strong> (ID: <code className="record-id">{savedRecord.id}</code>). Buyers can now discover it.</>
                : 'Your listing was recorded locally — connect Supabase to persist it.'}
            </p>
            <div className="farmer-success__summary card">
              <h3 className="heading-md mb-md">Your Listing Summary</h3>
              <div className="form-grid form-grid-2">
                <div><span className="label text-muted">Name</span><p className="heading-sm mt-sm">{form.farmerName}</p></div>
                <div><span className="label text-muted">Residue Type</span><p className="heading-sm mt-sm">{form.residueType}</p></div>
                <div><span className="label text-muted">Quantity</span><p className="heading-sm mt-sm">{displayQty}</p></div>
                <div><span className="label text-muted">Location</span><p className="heading-sm mt-sm">{form.location}{form.state ? `, ${form.state}` : ''}</p></div>
                <div><span className="label text-muted">Available From</span><p className="heading-sm mt-sm">{form.availabilityDate}</p></div>
                <div><span className="label text-muted">Pickup</span><p className="heading-sm mt-sm">{form.pickupPreference}</p></div>
              </div>
              {savedRecord && (
                <div className="mt-md">
                  <span className="badge badge-green">✓ Persisted in Supabase</span>
                  <span className="body-sm text-muted" style={{ marginLeft: '8px' }}>Status: {savedRecord.status}</span>
                </div>
              )}
            </div>
            <div className="farmer-success__actions">
              <button
                onClick={() => navigate(savedRecord?.id ? `/matches?listing=${savedRecord.id}` : '/matches')}
                className="btn btn-primary btn-lg"
              >
                View Matches →
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                Go to Dashboard
              </button>
              <button onClick={handleReset} className="btn btn-outline">
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Main form ─────────────────────────────────────────────────
  return (
    <main className="farmer-page">
      <div className="page-hero">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-eyebrow" style={{ color: 'var(--color-mint)', background: 'rgba(82,183,136,0.15)', display: 'inline-block' }}>
            Farmer Portal
          </div>
          <h1 className="display-lg text-white mt-md">List Your Crop Residue</h1>
          <p className="body-lg mt-md" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '520px' }}>
            Fill in the details below to list your available residue. We'll match you with
            suitable buyers or organisations near you — for free.
          </p>
        </div>
      </div>

      <div className="container section-sm">
        <div className="farmer-layout">
          <div className="farmer-form-wrap">

            {/* ── DB setup banner (shown when not configured) ── */}
            {!isConfigured && <DbSetupBanner />}

            {/* ── DB error (shown after a failed submit) ── */}
            {dbError && (
              <DbErrorAlert
                message={dbError}
                onRetry={() => setDbError(null)}
              />
            )}

            <form onSubmit={handleSubmit} noValidate aria-label="Residue listing form">

              {/* ── Section 01: Personal Info ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">01</span>
                  <div>
                    <h2 className="heading-lg">Your Information</h2>
                    <p className="body-sm text-muted">Tell us who you are and how to reach you.</p>
                  </div>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="farmerName">
                      Full Name <span className="required">*</span>
                    </label>
                    <input
                      id="farmerName"
                      name="farmerName"
                      type="text"
                      className={`form-control ${errors.farmerName ? 'form-control--error' : ''}`}
                      placeholder="e.g. Rajesh Patel"
                      value={form.farmerName}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={100}
                    />
                    {errors.farmerName && <span className="form-error" role="alert">{errors.farmerName}</span>}
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
                    <label className="form-label" htmlFor="contactEmail">Email Address</label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={`form-control ${errors.contactEmail ? 'form-control--error' : ''}`}
                      placeholder="your@email.com"
                      value={form.contactEmail}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={200}
                    />
                    {errors.contactEmail && <span className="form-error" role="alert">{errors.contactEmail}</span>}
                    <span className="form-hint">Used only for buyer contact — not shared publicly</span>
                  </div>
                </div>
              </div>

              {/* ── Section 02: Residue Details ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">02</span>
                  <div>
                    <h2 className="heading-lg">Residue Details</h2>
                    <p className="body-sm text-muted">Specify what you have available.</p>
                  </div>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="residueType">
                      Residue Type <span className="required">*</span>
                    </label>
                    <select
                      id="residueType"
                      name="residueType"
                      className={`form-control ${errors.residueType ? 'form-control--error' : ''}`}
                      value={form.residueType}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— Select type —</option>
                      {RESIDUE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors.residueType && <span className="form-error" role="alert">{errors.residueType}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="quantity">
                      Quantity <span className="required">*</span>
                    </label>
                    <div className="qty-input-wrap">
                      <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0.1"
                        step="0.5"
                        className={`form-control ${errors.quantity ? 'form-control--error' : ''}`}
                        placeholder="e.g. 15"
                        value={form.quantity}
                        onChange={handleChange}
                        disabled={loading}
                        style={{ borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', borderRight: 'none' }}
                      />
                      <select
                        name="unit"
                        className="form-control qty-unit"
                        value={form.unit}
                        onChange={handleChange}
                        disabled={loading}
                        aria-label="Unit"
                      >
                        <option value="tonnes">tonnes</option>
                        <option value="quintals">quintals</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                    {errors.quantity && <span className="form-error" role="alert">{errors.quantity}</span>}
                    {form.unit !== 'tonnes' && form.quantity > 0 && (
                      <span className="form-hint">
                        = {form.unit === 'quintals'
                            ? (Number(form.quantity) / 10).toFixed(2)
                            : (Number(form.quantity) / 1000).toFixed(3)} tonnes (stored in database)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section 03: Location ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">03</span>
                  <div>
                    <h2 className="heading-lg">Location</h2>
                    <p className="body-sm text-muted">This helps us find the nearest buyers.</p>
                  </div>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="location">
                      Village / Farm Location <span className="required">*</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className={`form-control ${errors.location ? 'form-control--error' : ''}`}
                      placeholder="e.g. Khambhat village, near highway 48"
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

              {/* ── Section 04: Availability & Pickup ── */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-num">04</span>
                  <div>
                    <h2 className="heading-lg">Availability &amp; Pickup</h2>
                    <p className="body-sm text-muted">When is the residue available and how should it be collected?</p>
                  </div>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="availabilityDate">
                      Available From <span className="required">*</span>
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
                      Pickup Preference <span className="required">*</span>
                    </label>
                    <select
                      id="pickupPreference"
                      name="pickupPreference"
                      className={`form-control ${errors.pickupPreference ? 'form-control--error' : ''}`}
                      value={form.pickupPreference}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">— Select preference —</option>
                      {PICKUP_PREFERENCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {errors.pickupPreference && <span className="form-error" role="alert">{errors.pickupPreference}</span>}
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="notes">Additional Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      placeholder="e.g. baling available, accessible road, special conditions..."
                      value={form.notes}
                      onChange={handleChange}
                      disabled={loading}
                      rows={3}
                      maxLength={1000}
                    />
                    <span className="form-hint">Optional — helps buyers understand your situation</span>
                  </div>
                </div>
              </div>

              {/* ── Access limitation notice ── */}
              <div className="alert alert-info mb-lg">
                <span>ℹ️</span>
                <p className="body-sm">
                  <strong>No authentication in this demo.</strong> All submitted listings are publicly
                  readable via the anon key. Do not submit real personal contact details.
                </p>
              </div>

              {/* ── Footer / Submit ── */}
              <div className="farmer-form-footer">
                <p className="body-sm text-muted">
                  Fields marked <span style={{ color: 'var(--color-clay)' }}>*</span> are required.
                  Quantity is stored as tonnes in the database.
                </p>
                <div className="flex gap-md">
                  <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
                    Reset
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                    {loading
                      ? <LoadingSpinner label="Saving to database…" />
                      : 'Submit Listing →'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ── Sidebar ── */}
          <aside className="farmer-sidebar">
            {/* DB status indicator */}
            <div className={`card farmer-tip-card db-indicator ${isConfigured ? 'db-indicator--connected' : 'db-indicator--offline'}`}>
              <div className="flex items-center gap-sm mb-sm">
                <span className="db-dot" />
                <span className="heading-sm">{isConfigured ? 'Database connected' : 'Database not connected'}</span>
              </div>
              <p className="body-sm text-muted">
                {isConfigured
                  ? 'Submissions will be saved to Supabase and persist between sessions.'
                  : 'Submissions will not be saved. See the setup banner above to configure Supabase.'}
              </p>
            </div>

            <div className="card farmer-tip-card mt-lg">
              <h3 className="heading-md mb-md">💡 Tips for a Good Listing</h3>
              <ul className="farmer-tips">
                <li>Be precise about the residue type — it directly affects match quality</li>
                <li>Estimate quantity conservatively; you can always add more later</li>
                <li>Include landmarks in the location field to help logistics</li>
                <li>Set an honest availability date — don't rush pickup arrangements</li>
                <li>State your pickup preference clearly to avoid confusion</li>
              </ul>
            </div>
            <div className="card farmer-tip-card mt-lg">
              <h3 className="heading-md mb-md">📋 What Happens Next?</h3>
              <ol className="farmer-steps">
                <li><strong>1.</strong> Your listing is saved and becomes active</li>
                <li><strong>2.</strong> Buyers matching your residue and location are notified</li>
                <li><strong>3.</strong> Interested buyers send a pickup/contact request</li>
                <li><strong>4.</strong> You confirm and coordinate logistics</li>
              </ol>
            </div>
            <div className="alert alert-success mt-lg">
              <span>🌱</span>
              <p className="body-sm">
                Every tonne diverted from burning avoids ~91 kg of CO₂ equivalent and
                removes toxic particulate matter from the air.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
