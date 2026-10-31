import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
          <LoadingSpinner label={t('matchDetails.loadingProfile')} />
        </div>
      </main>
    );
  }

  if (!normalizedBuyer) {
    return (
      <main className="match-details-page">
        <div className="container section">
          <div className="card text-center" style={{ padding: 'var(--space-3xl) var(--space-xl)' }}>
            <h1 className="heading-lg">{t('matchDetails.notFoundTitle')}</h1>
            <p className="body-md text-muted mt-sm mb-lg">
              {t('matchDetails.notFoundDesc')}
            </p>
            <Link to="/matches" className="btn btn-primary">
              {t('matchDetails.returnMarketplace')}
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
      setMsgError(t('matchDetails.errMessageLength'));
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
      setDbError(t('farmer.errUnexpected', 'An unexpected error occurred. Please try again.'));
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
            <Link to="/" className="breadcrumb-link">{t('matchDetails.overview')}</Link>
            <span className="breadcrumb-sep">/</span>
            <Link to="/matches" className="breadcrumb-link">{t('matchDetails.marketplace')}</Link>
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
              <span className="section-eyebrow">{t('matchDetails.dossier')}</span>
              <SplitText
                key={`buyer-dossier-${i18n.language}`}
                text={normalizedBuyer.orgName}
                tag="h1"
                className="display-lg"
                delay={0.03}
              />
              <div className="details-meta-row mt-sm">
                <span className="details-meta-tag font-medium">
                  {normalizedBuyer.location} {normalizedBuyer.state ? `(${normalizedBuyer.state})` : ''}
                </span>
                <span className={`status-pill ${normalizedBuyer.available ? 'status-pill--active' : 'status-pill--standby'}`}>
                  <span className="status-dot-mini" />
                  {normalizedBuyer.available ? t('matchDetails.activelyReceiving') : t('matchDetails.intakeOnStandby')}
                </span>
                <span className="badge badge-muted">
                  {normalizedBuyer.orgType ? t(`orgTypes.${normalizedBuyer.orgType}`, normalizedBuyer.orgType) : t('buyerCard.commercialBuyer')}
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
              <span className="score-summary-label">{t('matchDetails.algoCompatibility')}</span>
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
                <span className="badge badge-warm">{t('matchDetails.noListingSelected')}</span>
                <h3 className="heading-md mt-xs">{t('matchDetails.selectListingTitle')}</h3>
                <p className="body-sm text-muted mt-xs">
                  {t('matchDetails.selectListingDesc')}
                </p>
              </div>
              <Link to="/farmer" className="btn btn-primary btn-sm">{t('matchDetails.postListing')}</Link>
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
                    <span>{t(`crops.${norm.residueType}`, norm.residueType)}</span>
                    <span className="listing-chip-meta">
                      {norm.quantity}t · {norm.district || norm.state || norm.location}
                    </span>
                    {norm.isDemo ? (
                      <span className="chip-demo-tag">{t('matches.demoChip')}</span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>
                        {t('matches.liveChip')}
                      </span>
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
                <span className="badge badge-green">{t('matchDetails.evaluatedListing')}</span>
                <span className="heading-sm">
                  {t(`crops.${normalizedListing.residueType}`, normalizedListing.residueType)} ({normalizedListing.quantity} {t('common.tonnes', 'tonnes')})
                </span>
                <span className="body-sm text-muted">
                  {normalizedListing.district ? `${normalizedListing.district}, ` : ''}{normalizedListing.state || normalizedListing.location}
                </span>
              </div>
              <div className="flex items-center gap-sm">
                <Link to="/matches" className="btn btn-outline btn-sm">{t('matchDetails.allMatches')}</Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setSearchParams({})}
                >
                  {t('matchDetails.changeFarmLot')}
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
                <span className="font-semibold text-forest">{t('matchDetails.verifiedRecordLabel')}</span> {t('matchDetails.verifiedRecordText', { orgName: normalizedBuyer.orgName })}
              </div>
            )}

            {/* About Section */}
            <section className="card details-section">
              <h2 className="heading-md mb-sm">{t('matchDetails.facilityOverview')}</h2>
              <p className="body-md" style={{ lineHeight: '1.65' }}>
                {normalizedBuyer.notes || t('matchDetails.facilityOverviewDefault')}
              </p>
            </section>

            {/* Commercial Lot Valuation */}
            <section className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-md">{t('matchDetails.lotValuation')}</h2>
                {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
                  <span className="badge badge-green">{t('matchDetails.calculatedValue')}</span>
                ) : (
                  <span className="badge badge-muted">{t('matchDetails.priceUponInquiry')}</span>
                )}
              </div>

              <div className="spec-metric-grid">
                <div className="spec-metric-cell">
                  <span className="label">{t('matchDetails.buyerIntakePrice')}</span>
                  {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
                    <div>
                      <div className="display-md text-forest">
                        ₹{matchResult.metadata.pricing.pricePerTonne.toLocaleString('en-IN')}{' '}
                        <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>{t('matchDetails.perTonne')}</span>
                      </div>
                      {matchResult.metadata.pricing.isDemoPrice && (
                        <span className="badge badge-warm mt-xs">{t('matchDetails.refQuotation')}</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="badge badge-muted">{t('matchDetails.priceUponInquiry')}</span>
                      <p className="body-sm text-muted mt-xs">{t('matchDetails.submitInquiryBelow')}</p>
                    </div>
                  )}
                </div>

                <div className="spec-metric-cell">
                  <span className="label">{t('matchDetails.estimatedBatchValue')}</span>
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
                      <div className="heading-lg text-muted">{t('matchDetails.quoteRequired')}</div>
                      <p className="body-sm text-muted mt-xs">{t('matchDetails.quoteRequiredDesc')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="disclaimer-text mt-md">
                {t('matchDetails.disclaimerPricing')}
              </div>
            </section>

            {/* Location & Route Map */}
            <section className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-md">{t('matchDetails.haulageRoute')}</h2>
                <span className="badge badge-muted">{t('matchDetails.osmCompatible')}</span>
              </div>

              <p className="body-sm text-muted mb-md">
                {t('matchDetails.routeMappingDesc', {
                  origin: normalizedListing?.location || t('routeMap.origin'),
                  dest: normalizedBuyer.location,
                })}
              </p>

              <Suspense
                fallback={
                  <div className="route-map-loading">
                    <LoadingSpinner label={t('matchDetails.loadingMap')} />
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
                <h2 className="heading-md">{t('matchDetails.fiveDimensionEval')}</h2>
                <span className="badge badge-green">
                  {t('matchDetails.formulaLabel')}
                </span>
              </div>

              <div className="match-factors">
                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="font-medium body-sm">{t('matchDetails.dimQuantity')}</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.quantityFit || 0) * 100)}% ({matchResult?.weightedPoints?.quantity || 0} / 40 {t('common.pts', 'pts')})
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
                    <span className="font-medium body-sm">{t('matchDetails.dimProximity')}</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.proximityFit || 0) * 100)}% ({matchResult?.weightedPoints?.proximity || 0} / 30 {t('common.pts', 'pts')})
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
                    <span className="font-medium body-sm">{t('matchDetails.dimCapacity')}</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.capacityFit || 0) * 100)}% ({matchResult?.weightedPoints?.capacity || 0} / 20 {t('common.pts', 'pts')})
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
                    <span className="font-medium body-sm">{t('matchDetails.dimSynergy')}</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.useCaseFit || 0) * 100)}% ({matchResult?.weightedPoints?.useCase || 0} / 10 {t('common.pts', 'pts')})
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
                <span className="font-semibold body-sm">{t('matchDetails.cumulativeScore')}</span>
                <span className="heading-md text-forest">
                  {score}% ({matchResult?.weightedPoints?.total ?? score} / 100 {t('common.pts', 'pts')})
                </span>
              </div>

              {matchResult?.explanation?.summary && (
                <div className="summary-alert mt-md">
                  <span className="font-semibold text-forest">{t('matchDetails.assessment')}</span> {matchResult.explanation.summary}
                </div>
              )}
            </section>

            {/* Operational Parameters */}
            <section className="card details-section">
              <h2 className="heading-md mb-md">{t('matchDetails.operationalParameters')}</h2>
              <div className="spec-metric-grid">
                <div className="spec-metric-cell">
                  <span className="label">{t('matchDetails.requiredBatchSize')}</span>
                  <div className="heading-lg text-forest">{normalizedBuyer.requiredQuantity} {t('common.tonnes', 'tonnes')}</div>
                </div>
                <div className="spec-metric-cell">
                  <span className="label">{t('matchDetails.maxYardIntake')}</span>
                  <div className="heading-lg text-forest">
                    {normalizedBuyer.maxIntake ? `${normalizedBuyer.maxIntake} ${t('common.tonnes', 'tonnes')}` : t('buyer.flexibleCapacity')}
                  </div>
                </div>
                <div className="spec-metric-cell">
                  <span className="label">{t('matchDetails.targetOutput')}</span>
                  <div className="font-semibold mt-xs">
                    {normalizedBuyer.intendedUse ? t(`uses.${normalizedBuyer.intendedUse}`, normalizedBuyer.intendedUse) : '—'}
                  </div>
                </div>
                <div className="spec-metric-cell">
                  <span className="label">{t('matchDetails.intakeMode')}</span>
                  <div className="font-semibold mt-xs">
                    {normalizedBuyer.available ? t('matchDetails.activelyReceivingShort') : t('matchDetails.intakeStandbyShort')}
                  </div>
                </div>
              </div>

              <div className="mt-md pt-sm" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <span className="label">{t('matchDetails.acceptedResidues')}</span>
                <div className="tag-list mt-xs">
                  {normalizedBuyer.acceptedTypes.map((typeKey) => (
                    <span key={typeKey} className="badge badge-green">
                      {t(`crops.${typeKey}`, typeKey)}
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
                    <span>{t('matchDetails.inquiryLogged')}</span>
                  </div>
                  <h3 className="heading-md text-forest mt-xs">{t('matchDetails.inquiryTransmitted')}</h3>
                  <p className="body-sm text-muted mt-xs">
                    {t('matchDetails.inquiryTransmittedDesc', {
                      type: requestType === 'pickup'
                        ? t('matchDetails.optPickup')
                        : requestType === 'quote'
                        ? t('matchDetails.optQuote')
                        : t('matchDetails.optContact'),
                      dest: savedRequestId ? t('farmer.recordCommittedDb') : t('farmer.recordStoredLocal'),
                    })}
                  </p>
                  {savedRequestId && (
                    <p className="body-sm text-muted mt-xs">
                      {t('matchDetails.referenceId')} <code className="record-id">{savedRequestId}</code>
                    </p>
                  )}
                  <Link to="/dashboard" className="btn btn-primary w-full mt-md">
                    {t('matchDetails.openDashboard')}
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
                    {t('matchDetails.submitAdditional')}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="heading-md mb-xs">{t('matchDetails.submitInquiry')}</h3>
                  <p className="body-sm text-muted mb-md">
                    {t('matchDetails.directOutreach', { orgName: normalizedBuyer.orgName })}
                  </p>

                  {dbError && <DbErrorAlert message={dbError} onRetry={() => setDbError(null)} />}

                  <form onSubmit={handleSendRequest}>
                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor="requestType">{t('matchDetails.inquiryProtocol')}</label>
                      <select
                        id="requestType"
                        className="form-control"
                        value={requestType}
                        onChange={(e) => setRequestType(e.target.value)}
                        disabled={loading}
                      >
                        <option value="pickup">{t('matchDetails.optPickup')}</option>
                        <option value="quote">{t('matchDetails.optQuote')}</option>
                        <option value="contact">{t('matchDetails.optContact')}</option>
                      </select>
                    </div>

                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor="requester-name">{t('matchDetails.representativeName')}</label>
                      <input
                        id="requester-name"
                        type="text"
                        className="form-control"
                        placeholder={t('matchDetails.phRepresentative')}
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        disabled={loading}
                        maxLength={100}
                      />
                    </div>

                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor="requester-email">{t('matchDetails.officialEmail')}</label>
                      <input
                        id="requester-email"
                        type="email"
                        className="form-control"
                        placeholder={t('matchDetails.phOfficialEmail')}
                        value={requesterEmail}
                        onChange={(e) => setRequesterEmail(e.target.value)}
                        disabled={loading}
                        maxLength={200}
                      />
                    </div>

                    <div className="form-group mb-md">
                      <label className="form-label" htmlFor="contact-message">
                        {t('matchDetails.logisticsSpecs')} <span className="required">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        className={`form-control ${msgError ? 'form-control--error' : ''}`}
                        rows={4}
                        placeholder={t('matchDetails.phLogisticsSpecs', {
                          qty: normalizedListing?.quantity ?? '25',
                          type: normalizedListing ? t(`crops.${normalizedListing.residueType}`, normalizedListing.residueType) : t('crops.Paddy Straw', 'Paddy Straw'),
                          location: normalizedListing?.location ?? normalizedBuyer.location,
                        })}
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); setMsgError(''); }}
                        disabled={loading}
                        maxLength={2000}
                      />
                      {msgError && <span className="form-error" role="alert">{msgError}</span>}
                      <span className="form-hint">{t('matchDetails.charLimit', { count: message.length })}</span>
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                      {loading ? <LoadingSpinner label={t('matchDetails.transmitting')} /> : t('matchDetails.btnTransmit')}
                    </button>
                  </form>

                  <div className="divider" style={{ marginBlock: 'var(--space-md)' }} />
                  <div className="contact-info">
                    <span className="label">{t('matchDetails.registeredPoc')}</span>
                    <p className="body-sm text-muted mt-xs">
                      <strong>{t('matchDetails.emailLabel')}</strong> {normalizedBuyer.contact || 'procurement@buyer.in'}
                    </p>
                    <p className="body-sm text-muted">
                      <strong>{t('matchDetails.phoneLabel')}</strong> {normalizedBuyer.phone || '+91 98765 43210'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-md">
              <Link to="/matches" className="btn btn-outline w-full">
                {t('matchDetails.returnMatches')}
              </Link>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
