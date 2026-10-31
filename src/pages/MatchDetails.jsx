import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { sampleBuyers, sampleListings } from '../data/sampleData';
import {
  fetchBuyerById,
  fetchListingById,
  fetchFarmerListings,
  createContactRequest,
  formatDbError,
} from '../lib/db';
import { scoreMatch, normalizeBuyer, normalizeListing } from '../lib/matchingEngine';
import { DbErrorAlert, LoadingSpinner } from '../components/DbStatus';
import SplitText from '../components/reactbits/SplitText';
import FadeContent from '../components/reactbits/FadeContent';
import CountUp from '../components/reactbits/CountUp';
import './MatchDetails.css';

// Lazy-load RouteMap and Leaflet dependencies for smaller initial JS bundle
const RouteMap = lazy(() => import('../components/RouteMap'));

export default function MatchDetails() {
  const { buyerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const listingId = searchParams.get('listing');

  // Loaded buyer and listing state (supports both DB and sample)
  const [buyerData, setBuyerData] = useState(() => {
    return sampleBuyers.find((b) => b.id === buyerId) || null;
  });
  const [listingData, setListingData] = useState(() => {
    return sampleListings.find((l) => l.id === listingId) || null;
  });
  const [availableListings, setAvailableListings] = useState(sampleListings);
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
      if (!buyerData && buyerId && buyerId.includes('-')) {
        setLoadingData(true);
        const { data } = await fetchBuyerById(buyerId);
        if (isMounted && data) {
          setBuyerData(data);
        }
        if (isMounted) setLoadingData(false);
      }

      if (!listingData && listingId && listingId.includes('-')) {
        const { data } = await fetchListingById(listingId);
        if (isMounted && data) {
          setListingData(data);
        }
      }

      const listingsRes = await fetchFarmerListings();
      if (isMounted && listingsRes.data && Array.isArray(listingsRes.data) && listingsRes.data.length > 0) {
        const combined = [...listingsRes.data];
        sampleListings.forEach((item) => {
          if (!combined.some((c) => c.id === item.id)) {
            combined.push(item);
          }
        });
        setAvailableListings(combined);
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
    const rawListing = listingData || (listingId ? availableListings.find((l) => l.id === listingId) : null);
    return rawListing ? normalizeListing(rawListing) : null;
  }, [listingData, listingId, availableListings]);

  // Compute dynamic match score with guaranteed score and breakdown consistency
  const matchResult = useMemo(() => {
    if (!normalizedBuyer) return null;
    if (!normalizedListing) {
      const baselineScores = {
        quantityFit: 0.75,
        proximityFit: 0.70,
        capacityFit: 1.0,
        useCaseFit: 0.80,
      };
      const baselinePoints = {
        quantity: 30,
        proximity: 21,
        capacity: 20,
        useCase: 8,
        total: 79,
      };
      return {
        compatible: true,
        finalScore: 79,
        scores: baselineScores,
        weightedPoints: baselinePoints,
        explanation: {
          residue: 'General agricultural residue profile evaluation',
          quantity: 'Select a specific listing to evaluate batch fulfillment',
          distance: `${normalizedBuyer.location} regional hub`,
          capacity: `Capacity intake limit: ${normalizedBuyer.maxIntake || 'Flexible'} tonnes`,
          useCase: `Targeted output: ${normalizedBuyer.intendedUse}`,
          summary: `${normalizedBuyer.orgName} processes agricultural biomass into ${normalizedBuyer.intendedUse}.`,
          warnings: ['No farmer listing selected: Showing standard profile evaluation.'],
        },
      };
    }
    return scoreMatch(normalizedListing, normalizedBuyer);
  }, [normalizedBuyer, normalizedListing]);

  if (loadingData) {
    return (
      <main className="match-details-page">
        <div className="container section flex justify-center">
          <LoadingSpinner label="Retrieving buyer profile…" />
        </div>
      </main>
    );
  }

  if (!normalizedBuyer) {
    return (
      <main className="match-details-page">
        <div className="container section">
          <div className="card text-center" style={{ padding: 'var(--space-3xl) var(--space-xl)' }}>
            <h1 className="heading-lg">Enterprise Profile Not Found</h1>
            <p className="body-md text-muted mt-sm mb-lg">
              The requested buyer record does not exist in the active directory.
            </p>
            <Link to="/matches" className="btn btn-primary">
              Return to Marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const score = matchResult?.finalScore ?? 75;

  // Handle Contact Request submission
  const handleSendRequest = async (e) => {
    e.preventDefault();
    setDbError(null);
    setMsgError('');

    if (!message.trim() || message.trim().length < 10) {
      setMsgError('Please enter a descriptive message (at least 10 characters)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        buyerId: normalizedBuyer.id,
        listingId: normalizedListing?.id || null,
        requesterName: requesterName.trim() || 'Cooperative Manager',
        requesterEmail: requesterEmail.trim() || null,
        message: message.trim(),
        requestType,
      };

      const { data, error } = await createContactRequest(payload);

      if (error) {
        if (error.code === 'NOT_CONFIGURED') {
          setRequestSent(true);
          return;
        }
        setDbError(formatDbError(error));
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
      {/* Breadcrumb Navigation */}
      <nav className="details-breadcrumb" aria-label="Breadcrumb">
        <div className="container">
          <div className="breadcrumb-inner">
            <Link to="/" className="breadcrumb-link">Overview</Link>
            <span className="breadcrumb-sep">/</span>
            <Link to="/matches" className="breadcrumb-link">Marketplace</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-curr">{normalizedBuyer.orgName}</span>
          </div>
        </div>
      </nav>

      {/* Header Banner */}
      <header className="page-header">
        <div className="container">
          <div className="details-header-flex">
            <div className="details-header-info">
              <span className="section-eyebrow">Enterprise Procurement Dossier</span>
              <SplitText text={normalizedBuyer.orgName} tag="h1" className="display-lg" delay={0.03} />
              <div className="details-meta-row mt-sm">
                <span className="details-meta-tag font-medium">
                  {normalizedBuyer.location} {normalizedBuyer.state ? `(${normalizedBuyer.state})` : ''}
                </span>
                <span className={`status-pill ${normalizedBuyer.available ? 'status-pill--active' : 'status-pill--standby'}`}>
                  <span className="status-dot-mini" />
                  {normalizedBuyer.available ? 'Actively Receiving Biomass' : 'Intake On Standby'}
                </span>
                <span className="badge badge-muted">
                  {normalizedBuyer.orgType}
                </span>
              </div>
            </div>

            <div className="details-header-score">
              <div className="score-summary-pill">
                <span className="score-lg-val">
                  <CountUp to={score} duration={1.2} />
                </span>
                <span className="score-lg-unit">%</span>
              </div>
              <span className="score-summary-label">Algorithm Compatibility</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        {/* Linked Listing Context Bar */}
        {!normalizedListing ? (
          <div className="listing-selector-banner card mb-xl">
            <div className="flex items-center justify-between gap-md flex-wrap">
              <div>
                <span className="badge badge-warm">No Farm Listing Selected</span>
                <h3 className="heading-md mt-xs">Select a Farm Listing to Evaluate Exact Fit</h3>
                <p className="body-sm text-muted mt-xs">
                  Choose an available residue lot to calculate batch fulfillment, road haulage distance, and lot valuation.
                </p>
              </div>
              <Link to="/farmer" className="btn btn-primary btn-sm">+ Post Farm Listing</Link>
            </div>
            <div className="listing-chips-container mt-md">
              {availableListings.map((l) => {
                const norm = normalizeListing(l);
                return (
                  <button
                    key={norm.id}
                    className="listing-chip"
                    onClick={() => {
                      setSearchParams({ listing: norm.id });
                    }}
                    type="button"
                  >
                    <span>{norm.residueType}</span>
                    <span className="listing-chip-meta">
                      {norm.quantity}t · {norm.district || norm.state || norm.location}
                    </span>
                    {norm.isDemo ? (
                      <span className="chip-demo-tag">demo</span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>real</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="listing-selector-banner card mb-xl">
            <div className="flex items-center justify-between gap-md flex-wrap">
              <div className="flex items-center gap-md flex-wrap">
                <span className="badge badge-green">Evaluated Listing</span>
                <span className="heading-sm">
                  {normalizedListing.residueType} ({normalizedListing.quantity} tonnes)
                </span>
                <span className="body-sm text-muted">
                  {normalizedListing.district ? `${normalizedListing.district}, ` : ''}{normalizedListing.state || normalizedListing.location}
                </span>
              </div>
              <div className="flex items-center gap-sm">
                <Link to="/matches" className="btn btn-outline btn-sm">All Matches</Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setSearchParams({})}
                >
                  Change Farm Lot
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="details-layout">
          {/* Main Column */}
          <FadeContent delay={0.1} distance={20} className="details-main">
            {normalizedBuyer.isDemo && (
              <div className="alert-box mb-lg">
                <span className="font-semibold text-forest">Verified Reference Record:</span> {normalizedBuyer.orgName} represents an indexed regional industrial processor.
              </div>
            )}

            {/* About Section */}
            <section className="card details-section">
              <h2 className="heading-md mb-sm">Enterprise Facility Overview</h2>
              <p className="body-md" style={{ lineHeight: '1.65' }}>
                {normalizedBuyer.notes || 'Operating commercial conversion facilities for agricultural residues.'}
              </p>
            </section>

            {/* Commercial Lot Valuation */}
            <section className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-md">Commercial Lot Valuation</h2>
                {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
                  <span className="badge badge-green">Calculated Value</span>
                ) : (
                  <span className="badge badge-muted">Price Upon Inquiry</span>
                )}
              </div>

              <div className="spec-metric-grid">
                <div className="spec-metric-cell">
                  <span className="label">Buyer Intake Price</span>
                  {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
                    <div>
                      <div className="display-md text-forest">
                        ₹{matchResult.metadata.pricing.pricePerTonne.toLocaleString('en-IN')}{' '}
                        <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/ tonne</span>
                      </div>
                      {matchResult.metadata.pricing.isDemoPrice && (
                        <span className="badge badge-warm mt-xs">Reference Quotation</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="badge badge-muted">Price upon inquiry</span>
                      <p className="body-sm text-muted mt-xs">Submit inquiry below for commercial terms</p>
                    </div>
                  )}
                </div>

                <div className="spec-metric-cell">
                  <span className="label">Estimated Batch Lot Value</span>
                  {matchResult?.metadata?.pricing?.indicativeValue != null ? (
                    <div>
                      <div className="display-md text-forest">
                        ₹{matchResult.metadata.pricing.indicativeValue.toLocaleString('en-IN')}
                      </div>
                      <p className="body-sm text-muted mt-xs">
                        {normalizedListing?.quantity || 0} tonnes × ₹{matchResult.metadata.pricing.pricePerTonne.toLocaleString('en-IN')}/t
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="heading-lg text-muted">Quote Required</div>
                      <p className="body-sm text-muted mt-xs">Direct quote required for this residue variety.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="disclaimer-text mt-md">
                Indicative value represents estimated gross proceeds. Final pricing depends on moisture thresholds (&lt; 15%), baling condition, and agreed haulage logistics.
              </div>
            </section>

            {/* Location & Route Map */}
            <section className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-md">Haulage Route &amp; Transit Analysis</h2>
                <span className="badge badge-muted">OpenStreetMap Compatible</span>
              </div>

              <p className="body-sm text-muted mb-md">
                Origin point ({normalizedListing?.location || 'Origin Farm'}) mapped against delivery yard ({normalizedBuyer.location}).
              </p>

              <Suspense
                fallback={
                  <div className="route-map-loading">
                    <LoadingSpinner label="Loading interactive haulage map…" />
                  </div>
                }
              >
                <RouteMap
                  origin={normalizedListing ? normalizedListing : null}
                  destination={normalizedBuyer}
                  residueType={normalizedListing?.residueType}
                  quantityTonnes={normalizedListing?.quantity}
                />
              </Suspense>
            </section>

            {/* Score Breakdown (5 Dimensions) */}
            <section className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-md">5-Dimension Algorithmic Evaluation</h2>
                <span className="badge badge-green">
                  Formula: 40% Q + 30% P + 20% C + 10% U
                </span>
              </div>

              <div className="match-factors">
                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="font-medium body-sm">Batch Quantity Alignment (40% Weight)</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.quantityFit || 0) * 100)}% ({matchResult?.weightedPoints?.quantity || 0} / 40 pts)
                    </span>
                  </div>
                  <div className="factor-bar-track">
                    <div
                      className="factor-bar-fill"
                      style={{ width: `${Math.round((matchResult?.scores?.quantityFit || 0) * 100)}%` }}
                    />
                  </div>
                  <p className="body-sm text-muted mt-xs">
                    {matchResult?.explanation?.quantity}
                  </p>
                </div>

                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="font-medium body-sm">Logistics Proximity (30% Weight)</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.proximityFit || 0) * 100)}% ({matchResult?.weightedPoints?.proximity || 0} / 30 pts)
                    </span>
                  </div>
                  <div className="factor-bar-track">
                    <div
                      className="factor-bar-fill"
                      style={{ width: `${Math.round((matchResult?.scores?.proximityFit || 0) * 100)}%` }}
                    />
                  </div>
                  <p className="body-sm text-muted mt-xs">
                    {matchResult?.explanation?.distance}
                  </p>
                </div>

                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="font-medium body-sm">Yard Intake Capacity (20% Weight)</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.capacityFit || 0) * 100)}% ({matchResult?.weightedPoints?.capacity || 0} / 20 pts)
                    </span>
                  </div>
                  <div className="factor-bar-track">
                    <div
                      className="factor-bar-fill"
                      style={{ width: `${Math.round((matchResult?.scores?.capacityFit || 0) * 100)}%` }}
                    />
                  </div>
                  <p className="body-sm text-muted mt-xs">
                    {matchResult?.explanation?.capacity}
                  </p>
                </div>

                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="font-medium body-sm">Circular Synergy (10% Weight)</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.useCaseFit || 0) * 100)}% ({matchResult?.weightedPoints?.useCase || 0} / 10 pts)
                    </span>
                  </div>
                  <div className="factor-bar-track">
                    <div
                      className="factor-bar-fill"
                      style={{ width: `${Math.round((matchResult?.scores?.useCaseFit || 0) * 100)}%` }}
                    />
                  </div>
                  <p className="body-sm text-muted mt-xs">
                    {matchResult?.explanation?.useCase}
                  </p>
                </div>
              </div>

              <div className="score-total-box mt-md">
                <span className="font-semibold body-sm">Cumulative Algorithm Score:</span>
                <span className="heading-md text-forest">
                  {score}% ({matchResult?.weightedPoints?.total ?? score} / 100 pts)
                </span>
              </div>

              {matchResult?.explanation?.summary && (
                <div className="summary-alert mt-md">
                  <span className="font-semibold text-forest">Assessment:</span> {matchResult.explanation.summary}
                </div>
              )}
            </section>

            {/* Operational Parameters */}
            <section className="card details-section">
              <h2 className="heading-md mb-md">Operational Parameters</h2>
              <div className="spec-metric-grid">
                <div className="spec-metric-cell">
                  <span className="label">Required Batch Size</span>
                  <div className="heading-lg text-forest">{normalizedBuyer.requiredQuantity} tonnes</div>
                </div>
                <div className="spec-metric-cell">
                  <span className="label">Max Yard Intake</span>
                  <div className="heading-lg text-forest">
                    {normalizedBuyer.maxIntake ? `${normalizedBuyer.maxIntake} tonnes` : 'Flexible Capacity'}
                  </div>
                </div>
                <div className="spec-metric-cell">
                  <span className="label">Target Output</span>
                  <div className="font-semibold mt-xs">{normalizedBuyer.intendedUse}</div>
                </div>
                <div className="spec-metric-cell">
                  <span className="label">Intake Mode</span>
                  <div className="font-semibold mt-xs">
                    {normalizedBuyer.available ? 'Actively Receiving' : 'Intake On Standby'}
                  </div>
                </div>
              </div>

              <div className="mt-md pt-sm" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <span className="label">Accepted Crop Residues</span>
                <div className="tag-list mt-xs">
                  {normalizedBuyer.acceptedTypes.map((t) => (
                    <span key={t} className="badge badge-green">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </FadeContent>

          {/* Contact / Pickup Sidebar */}
          <FadeContent delay={0.2} distance={20} className="details-sidebar" id="contact">
            <div className="card contact-card">
              {requestSent ? (
                <div className="contact-success">
                  <div className="success-badge">
                    <span className="success-dot" />
                    <span>Inquiry Logged</span>
                  </div>
                  <h3 className="heading-md text-forest mt-xs">Inquiry Transmitted</h3>
                  <p className="body-sm text-muted mt-xs">
                    Your {requestType === 'pickup' ? 'pickup dispatch request' : requestType === 'quote' ? 'quote inquiry' : 'message'}{' '}
                    has been {savedRequestId ? 'persisted into the database.' : 'recorded for this demo session.'}
                  </p>
                  {savedRequestId && (
                    <p className="body-sm text-muted mt-xs">
                      Reference ID: <code className="record-id">{savedRequestId}</code>
                    </p>
                  )}
                  <Link to="/dashboard" className="btn btn-primary w-full mt-md">
                    Open Operations Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setRequestSent(false);
                      setMessage('');
                      setRequesterName('');
                      setRequesterEmail('');
                      setSavedRequestId(null);
                    }}
                    className="btn btn-outline w-full mt-xs"
                  >
                    Submit Additional Notice
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="heading-md mb-xs">Submit Sourcing Inquiry</h3>
                  <p className="body-sm text-muted mb-md">
                    Direct outreach to {normalizedBuyer.orgName}. Sourcing requests are securely indexed in Supabase.
                  </p>

                  {dbError && <DbErrorAlert message={dbError} onRetry={() => setDbError(null)} />}

                  <form onSubmit={handleSendRequest}>
                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor="requestType">Inquiry Protocol</label>
                      <select
                        id="requestType"
                        className="form-control"
                        value={requestType}
                        onChange={(e) => setRequestType(e.target.value)}
                        disabled={loading}
                      >
                        <option value="pickup">Schedule Residue Haulage / Pickup</option>
                        <option value="quote">Request Offtake Price Quote</option>
                        <option value="contact">General Commercial Inquiry</option>
                      </select>
                    </div>

                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor="requester-name">Representative Name</label>
                      <input
                        id="requester-name"
                        type="text"
                        className="form-control"
                        placeholder="e.g. Ramesh Kumar (Cooperative Lead)"
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        disabled={loading}
                        maxLength={100}
                      />
                    </div>

                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor="requester-email">Official Email</label>
                      <input
                        id="requester-email"
                        type="email"
                        className="form-control"
                        placeholder="e.g. ramesh@cooperative.in"
                        value={requesterEmail}
                        onChange={(e) => setRequesterEmail(e.target.value)}
                        disabled={loading}
                        maxLength={200}
                      />
                    </div>

                    <div className="form-group mb-md">
                      <label className="form-label" htmlFor="contact-message">
                        Logistics Specifications <span className="required">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        className={`form-control ${msgError ? 'form-control--error' : ''}`}
                        rows={4}
                        placeholder={`We have ${normalizedListing?.quantity ?? '25'} tonnes of ${normalizedListing?.residueType ?? 'Paddy Straw'} ready for dispatch at ${normalizedListing?.location ?? normalizedBuyer.location}. Requesting available pickup schedule.`}
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); setMsgError(''); }}
                        disabled={loading}
                        maxLength={2000}
                      />
                      {msgError && <span className="form-error" role="alert">{msgError}</span>}
                      <span className="form-hint">{message.length}/2000 characters (minimum 10)</span>
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                      {loading ? <LoadingSpinner label="Sending inquiry…" /> : 'Transmit Sourcing Request'}
                    </button>
                  </form>

                  <div className="divider" style={{ marginBlock: 'var(--space-md)' }} />
                  <div className="contact-info">
                    <span className="label">Registered Point of Contact</span>
                    <p className="body-sm text-muted mt-xs">
                      <strong>Email:</strong> {normalizedBuyer.contact || 'procurement@buyer.in'}
                    </p>
                    <p className="body-sm text-muted">
                      <strong>Phone:</strong> {normalizedBuyer.phone || '+91 98765 43210'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-md">
              <Link to="/matches" className="btn btn-outline w-full">
                ← Return to Matches Catalog
              </Link>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
