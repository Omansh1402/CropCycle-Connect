// src/pages/MatchDetails.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { sampleBuyers, sampleListings } from '../data/sampleData';
import {
  fetchBuyerById,
  fetchListingById,
  createContactRequest,
  formatDbError,
} from '../lib/db';
import { scoreMatch, normalizeBuyer, normalizeListing } from '../lib/matchingEngine';
import { DbErrorAlert, LoadingSpinner } from '../components/DbStatus';
import RouteMap from '../components/RouteMap';
import './MatchDetails.css';

export default function MatchDetails() {
  const { buyerId } = useParams();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listing');

  // Loaded buyer and listing state (supports both DB and sample)
  const [buyerData, setBuyerData] = useState(() => {
    return sampleBuyers.find((b) => b.id === buyerId) || null;
  });
  const [listingData, setListingData] = useState(() => {
    return sampleListings.find((l) => l.id === listingId) || null;
  });
  const [loadingData, setLoadingData] = useState(false);

  // Form states
  const [requestSent, setRequestSent] = useState(false);
  const [savedRequestId, setSavedRequestId] = useState(null);
  const [requestType, setRequestType] = useState('pickup');
  const [message, setMessage] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [msgError, setMsgError] = useState('');

  // ─── Try loading remote record if not found in sample catalog ───
  useEffect(() => {
    let isMounted = true;

    async function loadRemoteEntities() {
      // If buyer not in sampleData and looks like UUID
      if (!buyerData && buyerId && buyerId.includes('-')) {
        setLoadingData(true);
        const { data } = await fetchBuyerById(buyerId);
        if (isMounted && data) {
          setBuyerData(data);
        }
        if (isMounted) setLoadingData(false);
      }

      // If listing not in sampleData and looks like UUID
      if (!listingData && listingId && listingId.includes('-')) {
        const { data } = await fetchListingById(listingId);
        if (isMounted && data) {
          setListingData(data);
        }
      }
    }

    loadRemoteEntities();

    return () => {
      isMounted = false;
    };
  }, [buyerId, listingId, buyerData, listingData]);

  // Normalized entities for matching engine
  const normalizedBuyer = useMemo(() => {
    return buyerData ? normalizeBuyer(buyerData) : null;
  }, [buyerData]);

  const normalizedListing = useMemo(() => {
    return listingData ? normalizeListing(listingData) : null;
  }, [listingData]);

  // Compute dynamic match score
  const matchResult = useMemo(() => {
    if (!normalizedBuyer) return null;
    if (!normalizedListing) {
      // Fallback baseline score if no listing selected
      return {
        compatible: true,
        finalScore: buyerData.matchScore || 75,
        scores: { quantityFit: 0.8, proximityFit: 0.75, capacityFit: 1.0, useCaseFit: 0.8 },
        weightedPoints: { quantity: 32, proximity: 22.5, capacity: 20, useCase: 8, total: 82.5 },
        explanation: {
          residue: 'General agricultural residue profile evaluation',
          quantity: 'Select a specific listing to evaluate batch fulfillment',
          distance: `${normalizedBuyer.location} regional hub`,
          capacity: `Capacity intake limit: ${normalizedBuyer.maxIntake || 'Flexible'} tonnes`,
          useCase: `Targeted output: ${normalizedBuyer.intendedUse}`,
          summary: `${normalizedBuyer.orgName} processes agricultural biomass into ${normalizedBuyer.intendedUse}.`,
          warnings: [],
        },
      };
    }
    return scoreMatch(normalizedListing, normalizedBuyer);
  }, [normalizedBuyer, normalizedListing, buyerData]);

  if (loadingData) {
    return (
      <main className="match-details-page">
        <div className="container section flex justify-center">
          <LoadingSpinner message="Retrieving buyer profile..." />
        </div>
      </main>
    );
  }

  if (!normalizedBuyer) {
    return (
      <main className="match-details-page">
        <div className="container section">
          <div className="card" style={{ padding: 'var(--space-3xl)', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>❓</span>
            <h2 className="display-md mt-md">Buyer Not Found</h2>
            <p className="body-lg text-muted mt-md">
              The buyer profile you are looking for does not exist or may have been removed.
            </p>
            <Link to="/matches" className="btn btn-primary mt-xl">
              ← Back to All Matches
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const score = matchResult ? matchResult.finalScore : 70;
  const scoreClass =
    score >= 80 ? 'match-score-high' :
    score >= 60 ? 'match-score-medium' : 'match-score-low';

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setDbError(null);
    setMsgError('');

    if (!message.trim() || message.trim().length < 10) {
      setMsgError('Please write a message of at least 10 characters.');
      return;
    }

    if (requesterEmail && !/\S+@\S+\.\S+/.test(requesterEmail)) {
      setMsgError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const isBuyerUuid = buyerId && buyerId.includes('-');
      const isListingUuid = listingId && listingId.includes('-');

      const { data, error } = await createContactRequest({
        listingId: isListingUuid ? listingId : null,
        buyerId: isBuyerUuid ? buyerId : null,
        demoBuyerRef: isBuyerUuid ? null : buyerId,
        requestType,
        message,
        requesterName: requesterName.trim() || null,
        requesterEmail: requesterEmail.trim() || null,
      });

      if (error || !data) {
        setDbError(formatDbError(error) || 'Failed to submit request to Supabase. Please retry.');
        return;
      }

      setSavedRequestId(data?.id ?? null);
      setRequestSent(true);
    } catch {
      setDbError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="match-details-page">
      {/* Breadcrumb */}
      <div className="details-breadcrumb">
        <div className="container">
          <div className="flex items-center gap-sm body-sm text-muted">
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to="/matches">Matches</Link>
            <span>›</span>
            <span>{normalizedBuyer.orgName}</span>
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div className="details-hero">
        <div className="container details-hero-inner">
          <div className="details-hero-info">
            <div className="details-org-icon">
              {normalizedBuyer.orgName.charAt(0)}
            </div>
            <div>
              <span
                className="section-eyebrow"
                style={{ color: 'var(--color-mint)', background: 'rgba(82,183,136,0.15)' }}
              >
                Buyer Profile
              </span>
              <h1 className="display-md text-white mt-sm">{normalizedBuyer.orgName}</h1>
              <div className="flex items-center gap-md mt-md flex-wrap">
                <span className="flex items-center gap-sm body-md" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  📍 {normalizedBuyer.location} {normalizedBuyer.state ? `(${normalizedBuyer.state})` : ''}
                </span>
                <span className={`badge ${normalizedBuyer.available ? 'badge-green' : 'badge-muted'}`}>
                  {normalizedBuyer.available ? '● Currently Accepting Residue' : '○ Intake On Hold'}
                </span>
                <span className="badge badge-muted" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  {normalizedBuyer.orgType}
                </span>
              </div>
            </div>
          </div>

          <div className="details-score-block">
            <div
              className={`match-score-ring ${scoreClass}`}
              style={{ width: '96px', height: '96px', fontSize: '1.625rem' }}
              title="Calculated compatibility score"
            >
              {score}%
            </div>
            <span className="body-sm text-white mt-xs" style={{ opacity: 0.85, fontWeight: 600 }}>
              Compatibility Score
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.65)' }}>
              (4-Factor Weighted)
            </span>
          </div>
        </div>
      </div>

      <div className="container details-body">
        <div className="details-layout">
          {/* Main Column */}
          <div className="details-main">
            {normalizedBuyer.isDemo && (
              <div className="alert alert-warning mb-lg">
                ⚠️ <strong>Demonstration Profile:</strong> {normalizedBuyer.orgName} is sample
                demonstration data for the hackathon prototype.
              </div>
            )}

            {/* About Section */}
            <div className="card details-section">
              <h2 className="heading-lg mb-md">About This Buyer Organization</h2>
              <p className="body-md" style={{ lineHeight: '1.75', color: 'var(--color-dark)' }}>
                {normalizedBuyer.notes || 'Operating commercial conversion facilities for agricultural residues.'}
              </p>
            </div>

            {/* Feature 4: Potential Value & Indicative Pricing */}
            <div className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-lg">Commercial Potential Value</h2>
                {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
                  <span className="badge badge-green">Indicative Value</span>
                ) : (
                  <span className="badge badge-muted">Price Unavailable</span>
                )}
              </div>

              <div className="details-info-grid">
                <div className="details-info-cell">
                  <span className="label text-muted">Buyer Purchase Rate</span>
                  {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
                    <div>
                      <p className="display-md text-forest">
                        ₹{matchResult.metadata.pricing.pricePerTonne.toLocaleString('en-IN')}{' '}
                        <span style={{ fontSize: '1rem', fontWeight: 400 }}>/ tonne</span>
                      </p>
                      {matchResult.metadata.pricing.isDemoPrice && (
                        <span className="badge badge-warm mt-xs">⚠️ Demo Price (Sample Profile)</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="badge badge-muted" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                        Price unavailable
                      </span>
                      <p className="body-sm text-muted mt-xs">Contact buyer directly for commercial quotation</p>
                    </div>
                  )}
                </div>

                <div className="details-info-cell">
                  <span className="label text-muted">Indicative Lot Value</span>
                  {matchResult?.metadata?.pricing?.indicativeValue != null ? (
                    <div>
                      <p className="display-md text-forest" style={{ color: 'var(--color-forest-dark)' }}>
                        ₹{matchResult.metadata.pricing.indicativeValue.toLocaleString('en-IN')}
                      </p>
                      <p className="body-sm text-muted mt-xs">
                        Calculated as {normalizedListing?.quantity || 0} tonnes × ₹{matchResult.metadata.pricing.pricePerTonne.toLocaleString('en-IN')}/t
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="heading-lg text-muted">Quote required</p>
                      <p className="body-sm text-muted mt-xs">Submit an inquiry or quote request below to receive pricing terms.</p>
                    </div>
                  )}
                </div>
              </div>

              <p className="body-xs text-muted mt-md" style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '8px' }}>
                ℹ️ Indicative value is calculated from available database records. Final transaction amounts depend on residue moisture content, purity testing, and delivery terms agreed between buyer and farmer.
              </p>
            </div>

            {/* Feature 1: Location & RouteMap */}
            <div className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-lg">Location & Transit Route</h2>
                <span className="badge badge-forest">OpenStreetMap Compatible</span>
              </div>

              <p className="body-sm text-muted mb-md">
                Geographic visualization showing farmer lot origin ({normalizedListing?.location || 'Origin Farm'}) and buyer facility ({normalizedBuyer.location}). Road routes are displayed only when successfully provided by the routing service.
              </p>

              <RouteMap
                origin={normalizedListing}
                destination={normalizedBuyer}
                residueType={normalizedListing?.residueType}
                quantityTonnes={normalizedListing?.quantity}
              />
            </div>

            {/* Step 4: Full Multi-Factor Score Breakdown */}
            <div className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-lg">Smart Match Score Breakdown</h2>
                <span className="badge badge-green">
                  Formula: 40% Q + 30% P + 20% C + 10% U
                </span>
              </div>

              <p className="body-sm text-muted mb-lg">
                Calculated dynamically against{' '}
                {normalizedListing ? (
                  <strong>
                    {normalizedListing.residueType} ({normalizedListing.quantity} tonnes from {normalizedListing.district || normalizedListing.state})
                  </strong>
                ) : (
                  'general buyer capacity parameters'
                )}
                .
              </p>

              {/* Component Progress Bars */}
              <div className="match-factors">
                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="heading-sm">Quantity Alignment (40% Weight)</span>
                    <span className="heading-sm" style={{ color: 'var(--color-forest)' }}>
                      {Math.round((matchResult?.scores?.quantityFit || 0) * 100)}% ({matchResult?.weightedPoints?.quantity || 0} / 40 pts)
                    </span>
                  </div>
                  <div className="progress-bar mb-xs">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.round((matchResult?.scores?.quantityFit || 0) * 100)}%` }}
                    />
                  </div>
                  <p className="body-sm text-muted">
                    {matchResult?.explanation?.quantity}
                  </p>
                </div>

                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="heading-sm">Geographic Proximity (30% Weight)</span>
                    <span className="heading-sm" style={{ color: 'var(--color-forest)' }}>
                      {Math.round((matchResult?.scores?.proximityFit || 0) * 100)}% ({matchResult?.weightedPoints?.proximity || 0} / 30 pts)
                    </span>
                  </div>
                  <div className="progress-bar mb-xs">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.round((matchResult?.scores?.proximityFit || 0) * 100)}%`, background: 'var(--color-forest-mid)' }}
                    />
                  </div>
                  <p className="body-sm text-muted">
                    {matchResult?.explanation?.distance}
                  </p>
                </div>

                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="heading-sm">Available Capacity Fit (20% Weight)</span>
                    <span className="heading-sm" style={{ color: 'var(--color-forest)' }}>
                      {Math.round((matchResult?.scores?.capacityFit || 0) * 100)}% ({matchResult?.weightedPoints?.capacity || 0} / 20 pts)
                    </span>
                  </div>
                  <div className="progress-bar mb-xs">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.round((matchResult?.scores?.capacityFit || 0) * 100)}%`, background: '#52b788' }}
                    />
                  </div>
                  <p className="body-sm text-muted">
                    {matchResult?.explanation?.capacity}
                  </p>
                </div>

                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="heading-sm">Use-Case Value Synergy (10% Weight)</span>
                    <span className="heading-sm" style={{ color: 'var(--color-forest)' }}>
                      {Math.round((matchResult?.scores?.useCaseFit || 0) * 100)}% ({matchResult?.weightedPoints?.useCase || 0} / 10 pts)
                    </span>
                  </div>
                  <div className="progress-bar mb-xs">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.round((matchResult?.scores?.useCaseFit || 0) * 100)}%`, background: '#74c69d' }}
                    />
                  </div>
                  <p className="body-sm text-muted">
                    {matchResult?.explanation?.useCase}
                  </p>
                </div>
              </div>

              {/* Explanatory summary narrative */}
              {matchResult?.explanation?.summary && (
                <div className="alert alert-info mt-lg" style={{ background: 'rgba(45,106,79,0.06)', borderColor: 'rgba(45,106,79,0.2)' }}>
                  <strong>Compatibility Summary:</strong> {matchResult.explanation.summary}
                </div>
              )}
            </div>

            {/* Operational Specifications */}
            <div className="card details-section">
              <h2 className="heading-lg mb-lg">Buyer Operational Parameters</h2>
              <div className="details-info-grid">
                <div className="details-info-cell">
                  <span className="label text-muted">Required Batch Size</span>
                  <p className="display-md text-forest">
                    {normalizedBuyer.requiredQuantity}{' '}
                    <span style={{ fontSize: '1rem', fontWeight: '400' }}>tonnes</span>
                  </p>
                </div>
                <div className="details-info-cell">
                  <span className="label text-muted">Maximum Intake Capacity</span>
                  <p className="display-md text-forest">
                    {normalizedBuyer.maxIntake ? (
                      <>
                        {normalizedBuyer.maxIntake}{' '}
                        <span style={{ fontSize: '1rem', fontWeight: '400' }}>tonnes</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '1.25rem' }}>Flexible</span>
                    )}
                  </p>
                </div>
                <div className="details-info-cell">
                  <span className="label text-muted">Intended Output</span>
                  <p className="heading-lg mt-xs">{normalizedBuyer.intendedUse}</p>
                </div>
                <div className="details-info-cell">
                  <span className="label text-muted">Operational Status</span>
                  <p className="heading-lg mt-xs">
                    {normalizedBuyer.available ? '✅ Actively Accepting' : '⏸ Intake On Hold'}
                  </p>
                </div>
              </div>

              <div className="mt-lg">
                <span className="label text-muted">Accepted Feedstocks</span>
                <div className="tag-list mt-xs">
                  {normalizedBuyer.acceptedTypes.map((t) => (
                    <span key={t} className="badge badge-green">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Linked Listing Card */}
            {normalizedListing && (
              <div className="card details-section">
                <h2 className="heading-lg mb-lg">Evaluated Farmer Listing</h2>
                <div className="details-info-grid">
                  <div className="details-info-cell">
                    <span className="label text-muted">Residue Type</span>
                    <p className="heading-lg mt-xs">{normalizedListing.residueType}</p>
                  </div>
                  <div className="details-info-cell">
                    <span className="label text-muted">Available Quantity</span>
                    <p className="heading-lg mt-xs">{normalizedListing.quantity} tonnes</p>
                  </div>
                  <div className="details-info-cell">
                    <span className="label text-muted">Farmer Location</span>
                    <p className="heading-lg mt-xs">
                      {normalizedListing.district ? `${normalizedListing.district}, ` : ''}{normalizedListing.state || normalizedListing.location}
                    </p>
                  </div>
                  <div className="details-info-cell">
                    <span className="label text-muted">Pickup Preference</span>
                    <p className="heading-lg mt-xs">{normalizedListing.pickupPreference}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Sidebar */}
          <div className="details-sidebar" id="contact">
            <div className="card contact-card">
              {requestSent ? (
                <div className="contact-success">
                  <div style={{ fontSize: '3rem' }}>✅</div>
                  <h3 className="heading-lg text-forest">Request Submitted!</h3>
                  <p className="body-md text-muted">
                    Your {requestType === 'pickup' ? 'pickup request'
                           : requestType === 'quote' ? 'quote request'
                           : 'inquiry message'} has been{' '}
                    {savedRequestId
                      ? <><strong>saved to Supabase database</strong> and logged for the buyer.</>
                      : 'recorded for this demo session.'}
                  </p>
                  {savedRequestId && (
                    <p className="body-sm text-muted" style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      DB Request ID: {savedRequestId}
                    </p>
                  )}
                  <Link to="/dashboard" className="btn btn-primary w-full mt-md">
                    View in Live Dashboard →
                  </Link>
                  <button
                    onClick={() => {
                      setRequestSent(false);
                      setMessage('');
                      setRequesterName('');
                      setRequesterEmail('');
                      setSavedRequestId(null);
                    }}
                    className="btn btn-outline w-full mt-sm"
                  >
                    Send Another Inquiry
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="heading-lg mb-md">📬 Request Pickup / Connect</h3>
                  <p className="body-sm text-muted mb-lg">
                    Direct outreach to {normalizedBuyer.orgName}. Messages are stored securely in Supabase.
                  </p>

                  {dbError && <DbErrorAlert message={dbError} onRetry={() => setDbError(null)} />}

                  <form onSubmit={handleSendRequest}>
                    <div className="form-group mb-md">
                      <label className="form-label" htmlFor="requestType">Inquiry Type</label>
                      <select
                        id="requestType"
                        className="form-control"
                        value={requestType}
                        onChange={(e) => setRequestType(e.target.value)}
                        disabled={loading}
                      >
                        <option value="pickup">Schedule Residue Pickup / Collection</option>
                        <option value="contact">General Commercial Inquiry</option>
                        <option value="quote">Request Offtake Price Quote</option>
                      </select>
                    </div>

                    <div className="form-group mb-md">
                      <label className="form-label" htmlFor="requester-name">Your Full Name</label>
                      <input
                        id="requester-name"
                        type="text"
                        className="form-control"
                        placeholder="Farmer or Aggregate Manager"
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        disabled={loading}
                        maxLength={100}
                      />
                    </div>

                    <div className="form-group mb-md">
                      <label className="form-label" htmlFor="requester-email">Contact Email</label>
                      <input
                        id="requester-email"
                        type="email"
                        className="form-control"
                        placeholder="farmer@example.com"
                        value={requesterEmail}
                        onChange={(e) => setRequesterEmail(e.target.value)}
                        disabled={loading}
                        maxLength={200}
                      />
                    </div>

                    <div className="form-group mb-lg">
                      <label className="form-label" htmlFor="contact-message">
                        Message Details <span className="required">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        className={`form-control ${msgError ? 'form-control--error' : ''}`}
                        rows={5}
                        placeholder={`Hi, I have ${normalizedListing?.quantity ?? '18'} tonnes of ${normalizedListing?.residueType ?? 'Paddy Straw'} located at ${normalizedListing?.location ?? normalizedBuyer.location}. Requesting details on collection dates and logistics.`}
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); setMsgError(''); }}
                        disabled={loading}
                        maxLength={2000}
                      />
                      {msgError && <span className="form-error" role="alert">{msgError}</span>}
                      <span className="form-hint">{message.length}/2000 characters</span>
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                      {loading ? <LoadingSpinner label="Persisting to DB…" /> : 'Send Request to Buyer →'}
                    </button>
                  </form>

                  <div className="divider" />
                  <div className="contact-info">
                    <h4 className="heading-sm mb-md">Direct Contact Info</h4>
                    <p className="body-sm text-muted mb-sm">
                      <strong>Email:</strong> {normalizedBuyer.contact || 'contact@example.com'}
                    </p>
                    <p className="body-sm text-muted">
                      <strong>Phone:</strong> {normalizedBuyer.phone || '+91 98765 00000'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-lg">
              <Link to="/matches" className="btn btn-outline w-full">
                ← Back to Matches Catalog
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
