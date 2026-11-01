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
import { VEHICLE_CONFIGS, calculateTransportationCost, calculateDeliveredCost } from '../lib/transportCalculator';
import { useTranslation } from '../lib/i18n';
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
  const { t, tResidue, tVehicle, tPurpose, tIndustry } = useTranslation();

  // Loaded buyer and listing state (supports both DB and sample)
  const [buyerData, setBuyerData] = useState(() => {
    return sampleBuyers.find((b) => b.id === buyerId) || null;
  });
  const [listingData, setListingData] = useState(() => {
    return sampleListings.find((l) => l.id === listingId) || null;
  });
  const [availableListings, setAvailableListings] = useState(sampleListings);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('auto');

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

  // Compute detailed transport and delivered cost
  const transportCalc = useMemo(() => {
    if (!normalizedListing || !normalizedBuyer) return null;
    const distanceKm = matchResult?.metadata?.coordinateDistanceKm || matchResult?.metadata?.estimatedDistanceKm || 120;
    const isInterstate = matchResult?.metadata?.commercial?.isInterstate ?? (
      (normalizedListing.state || '').trim().toLowerCase() !== (normalizedBuyer.state || '').trim().toLowerCase()
    );
    const vTier = selectedVehicle !== 'auto' ? selectedVehicle : (
      distanceKm > 400 || normalizedListing.quantity > 20 ? 'heavy_truck' :
      distanceKm > 100 || normalizedListing.quantity > 8 ? 'medium_truck' :
      distanceKm > 30 ? 'small_truck' : 'tractor_trolley'
    );
    const transport = calculateTransportationCost({
      quantityTonnes: normalizedListing.quantity,
      distanceKm,
      vehicleType: vTier,
      isInterstate,
    });
    const purchasePrice = normalizedListing.askingPricePerTonne || matchResult?.metadata?.pricing?.pricePerTonne || normalizedBuyer.offeredPricePerTonne || 2100;
    const delivered = calculateDeliveredCost({
      purchasePricePerTonne: purchasePrice,
      transportCostPerTonne: transport?.costPerTonne,
      quantityTonnes: normalizedListing.quantity,
    });
    return { transport, delivered, purchasePrice, distanceKm, isInterstate, vTier };
  }, [normalizedListing, normalizedBuyer, matchResult, selectedVehicle]);

  if (loadingData) {
    return (
      <main className="match-details-page">
        <div className="container section flex justify-center">
          <LoadingSpinner label={t('retrievingBuyerProfile')} />
        </div>
      </main>
    );
  }

  if (!normalizedBuyer) {
    return (
      <main className="match-details-page">
        <div className="container section">
          <div className="error-state-card text-center">
            <h2 className="heading-lg">{t('buyerProfileNotLocated')}</h2>
            <p className="body-md text-muted mt-xs">
              {t('buyerProfileNotLocatedDesc')}
            </p>
            <Link to="/matches" className="btn btn-primary mt-md">
              {t('returnToMatchesCatalog')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const score = matchResult ? matchResult.finalScore : 70;
  const scoreBadgeClass =
    score >= 80 ? 'score-pill--high' :
    score >= 60 ? 'score-pill--medium' : 'score-pill--low';

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setDbError(null);
    setMsgError('');

    if (!message.trim() || message.trim().length < 10) {
      setMsgError(t('msgMinCharsErr'));
      return;
    }

    setLoading(true);
    try {
      const isRealListing = listingId && listingId.includes('-');
      const isRealBuyer = buyerId && buyerId.includes('-');

      const { data, error } = await createContactRequest({
        listingId: isRealListing ? listingId : null,
        buyerId: isRealBuyer ? buyerId : null,
        demoBuyerRef: !isRealBuyer ? buyerId : null,
        requestType,
        message,
        requesterName: requesterName.trim() || null,
        requesterEmail: requesterEmail.trim() || null,
      });

      if (error) {
        if (error.code === 'NOT_CONFIGURED') {
          setRequestSent(true);
          setSavedRequestId(null);
          return;
        }
        setDbError(formatDbError(error));
        return;
      }

      setSavedRequestId(data?.id || null);
      setRequestSent(true);
    } catch {
      setDbError(t('networkErrSendingInquiry'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="match-details-page">
      {/* Page Header */}
      <header className="page-header">
        <div className="container">
          <div className="breadcrumb-nav mb-sm">
            <Link to="/matches" className="body-sm text-forest font-medium">{t('allMatchesBreadcrumb')}</Link>
            <span className="body-sm text-muted"> / </span>
            <span className="body-sm text-muted">{normalizedBuyer.orgName}</span>
          </div>

          <div className="page-header__flex">
            <div>
              <div className="flex items-center gap-xs flex-wrap mb-xs">
                <span className="badge badge-muted">
                  {tIndustry(normalizedBuyer.orgType) || t('industrialBuyer')}
                </span>
                {normalizedBuyer.purchasingPurpose && (
                  <span className="badge badge-warm">{tPurpose(normalizedBuyer.purchasingPurpose)}</span>
                )}
                {normalizedBuyer.isDemo && (
                  <span className="badge badge-muted">{t('referenceRecord')}</span>
                )}
                <span className={`status-pill ${normalizedBuyer.available ? 'status-pill--active' : 'status-pill--standby'}`}>
                  <span className="status-dot-mini" />
                  {normalizedBuyer.available ? t('activeIntake') : t('intakeStandby')}
                </span>
              </div>
              <SplitText text={normalizedBuyer.orgName} tag="h1" className="display-lg" delay={0.02} />
              <p className="body-lg text-muted mt-xs">
                {normalizedBuyer.location}, {normalizedBuyer.state} · {t('seekingTonnes', { quantity: normalizedBuyer.requiredQuantity })}
              </p>
            </div>

            {/* Score Callout */}
            <div className="score-callout-card">
              <span className="score-callout-label">{t('matchAlignment')}</span>
              <div className={`score-pill ${scoreBadgeClass}`} style={{ fontSize: '1.75rem', padding: '8px 16px' }}>
                <span className="score-val"><CountUp to={score} duration={1.2} /></span>
                <span className="score-unit">%</span>
              </div>
              <span className="body-xs text-muted mt-xs">
                {score >= 80 ? t('optimalSourcingMatch') : score >= 60 ? t('compatibleProfile') : t('partialMatch')}
              </span>
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
                <span className="badge badge-warm">{t('noFarmListingSelected')}</span>
                <h3 className="heading-md mt-xs">{t('selectFarmListingPrompt')}</h3>
                <p className="body-sm text-muted mt-xs">
                  {t('selectFarmListingDesc')}
                </p>
              </div>
              <Link to="/farmer" className="btn btn-primary btn-sm">{t('postFarmListing')}</Link>
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
                    <span>{tResidue(norm.residueType)}</span>
                    <span className="listing-chip-meta">
                      {norm.quantity}t · {norm.district || norm.state || norm.location}
                    </span>
                    {norm.isDemo ? (
                      <span className="chip-demo-tag">{t('referenceRecord')}</span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>{t('verifiedBadge')}</span>
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
                <span className="badge badge-green">{t('evaluatedListing')}</span>
                <span className="heading-sm">
                  {tResidue(normalizedListing.residueType)} ({normalizedListing.quantity} {t('tonnes')})
                </span>
                <span className="body-sm text-muted">
                  {normalizedListing.district ? `${normalizedListing.district}, ` : ''}{normalizedListing.state || normalizedListing.location}
                </span>
              </div>
              <div className="flex items-center gap-sm">
                <Link to="/matches" className="btn btn-outline btn-sm">{t('allMatches')}</Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setSearchParams({})}
                >
                  {t('changeFarmLot')}
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
                <span className="font-semibold text-forest">{t('verifiedReferenceRecord')}:</span> {normalizedBuyer.orgName} {t('indexedProcessorDesc')}
              </div>
            )}

            {/* About Section */}
            <section className="card details-section">
              <h2 className="heading-md mb-sm">{t('enterpriseFacilityOverview')}</h2>
              <p className="body-md" style={{ lineHeight: '1.65' }}>
                {normalizedBuyer.notes || 'Operating commercial conversion facilities for agricultural residues.'}
              </p>
            </section>

            {/* Commercial Lot Valuation */}
            <section className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-md">{t('commercialLotValuation')}</h2>
                {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
                  <span className="badge badge-green">{t('calculatedValue')}</span>
                ) : (
                  <span className="badge badge-muted">{t('priceUponInquiry')}</span>
                )}
              </div>

              <div className="spec-metric-grid">
                <div className="spec-metric-cell">
                  <span className="label">{t('buyerIntakePrice')}</span>
                  {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
                    <div>
                      <div className="display-md text-forest">
                        ₹{matchResult.metadata.pricing.pricePerTonne.toLocaleString('en-IN')}{' '}
                        <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/ {t('tonnes')}</span>
                      </div>
                      {matchResult.metadata.pricing.isDemoPrice && (
                        <span className="badge badge-warm mt-xs">{t('referenceQuotation')}</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="badge badge-muted">{t('priceUponInquiry')}</span>
                      <p className="body-sm text-muted mt-xs">{t('submitInquiryForCommercialTerms')}</p>
                    </div>
                  )}
                </div>

                <div className="spec-metric-cell">
                  <span className="label">{t('estimatedBatchLotValue')}</span>
                  {matchResult?.metadata?.pricing?.indicativeValue != null ? (
                    <div>
                      <div className="display-md text-forest">
                        ₹{matchResult.metadata.pricing.indicativeValue.toLocaleString('en-IN')}
                      </div>
                      <p className="body-sm text-muted mt-xs">
                        {normalizedListing?.quantity || 0} {t('tonnes')} × ₹{matchResult.metadata.pricing.pricePerTonne.toLocaleString('en-IN')}/{t('tonnes')}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="heading-lg text-muted">{t('quoteRequired')}</div>
                      <p className="body-sm text-muted mt-xs">{t('directQuoteRequired')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="disclaimer-text mt-md">
                {t('lotValuationDisclaimer')}
              </div>
            </section>

            {/* Smart Interstate Logistics & Delivered Cost Breakdown */}
            {transportCalc && transportCalc.transport && (
              <section className="card details-section">
                <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                  <div>
                    <h2 className="heading-md">{t('smartLogisticsBreakdown')}</h2>
                    <p className="body-sm text-muted">
                      {t('multiTierFreightModel')}
                    </p>
                  </div>
                  <span className="badge badge-green">
                    {transportCalc.isInterstate ? t('interstateDelivery') : t('intraStateDelivery')}
                  </span>
                </div>

                {/* Route & Distance Info */}
                <div className="spec-table-grid mb-md">
                  <div className="spec-item">
                    <span className="label">{t('originLabel')}</span>
                    <div className="spec-val">{normalizedListing.location}{normalizedListing.state ? `, ${normalizedListing.state}` : ''}</div>
                  </div>
                  <div className="spec-item">
                    <span className="label">{t('destinationLabel')}</span>
                    <div className="spec-val">{normalizedBuyer.location}, {normalizedBuyer.state}</div>
                  </div>
                  <div className="spec-item">
                    <span className="label">{t('roadTransitDistance')}</span>
                    <div className="spec-val font-semibold text-forest">
                      {transportCalc.distanceKm} km ({t('osrmRoadRouting')})
                    </div>
                  </div>
                  <div className="spec-item">
                    <span className="label">{t('activeVehicleProfile')}</span>
                    <div className="spec-val">
                      <select
                        value={selectedVehicle}
                        onChange={(e) => setSelectedVehicle(e.target.value)}
                        className="form-control"
                        style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                      >
                        <option value="auto">{t('autoSelectedTier')} ({tVehicle(transportCalc.transport.vehicleConfig.id) || transportCalc.transport.vehicleConfig.label})</option>
                        {Object.values(VEHICLE_CONFIGS).map((v) => (
                          <option key={v.id} value={v.id}>
                            {tVehicle(v.id) || v.label} ({v.payloadTonnes}T payload · ₹{v.ratePerKm}/km)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4 Cost Cards: Trips, Cost/Trip, Transport/Tonne, Delivered/Tonne */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-md">
                  <div className="card" style={{ padding: 'var(--space-md)', background: '#F8FAF9' }}>
                    <span className="text-muted body-sm">{t('requiredTripsCard')}</span>
                    <div className="heading-lg text-forest mt-xs">{transportCalc.transport.trips} {transportCalc.transport.trips > 1 ? t('tripPlural') : t('tripSingular')}</div>
                    <span className="body-xs text-muted">{t('tripCeilingExplanation', { quantity: normalizedListing.quantity, capacity: transportCalc.transport.vehicleConfig.payloadCapacity })}</span>
                  </div>
                  <div className="card" style={{ padding: 'var(--space-md)', background: '#F8FAF9' }}>
                    <span className="text-muted body-sm">{t('costPerTripCard')}</span>
                    <div className="heading-lg text-forest mt-xs">₹{transportCalc.transport.costPerTrip.toLocaleString('en-IN')}</div>
                    <span className="body-xs text-muted">{t('freightTollsHandling')}</span>
                  </div>
                  <div className="card" style={{ padding: 'var(--space-md)', background: '#F8FAF9' }}>
                    <span className="text-muted body-sm">{t('transportExpensePerTonne')}</span>
                    <div className="heading-lg text-forest mt-xs">₹{transportCalc.transport.costPerTonne.toLocaleString('en-IN')} / {t('tonnes')}</div>
                    <span className="body-xs text-muted">{t('totalLotLabel')} ₹{transportCalc.transport.totalTransportationCost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="card" style={{ padding: 'var(--space-md)', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <span className="text-muted body-sm font-medium">{t('finalDeliveredRateCard')}</span>
                    <div className="heading-lg text-forest mt-xs font-bold">₹{transportCalc.delivered.deliveredCostPerTonne.toLocaleString('en-IN')} / {t('tonnes')}</div>
                    <span className="body-xs text-muted">{t('totalLotLabel')} ₹{transportCalc.delivered.totalDeliveredCost.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Delivered Cost Formula Breakdown */}
                <div className="card" style={{ padding: 'var(--space-md)', background: '#FAFAFA', border: '1px solid #E5E7EB' }}>
                  <span className="font-semibold body-sm">{t('finalDeliveredCostFormulaTitle')}</span>
                  <div className="body-sm mt-xs" style={{ fontFamily: 'monospace' }}>
                    {t('finalDeliveredCostFormulaText', { purchase: transportCalc.delivered.purchasePricePerTonne.toLocaleString('en-IN'), transport: transportCalc.delivered.transportCostPerTonne.toLocaleString('en-IN'), other: transportCalc.delivered.otherChargesPerTonne, delivered: transportCalc.delivered.deliveredCostPerTonne.toLocaleString('en-IN') })}
                  </div>
                </div>

                <div className="mt-md body-xs text-muted" style={{ fontStyle: 'italic' }}>
                  {t('indicativeTransportNotice')}
                </div>
              </section>
            )}

            {/* Location & Route Map */}
            <section className="card details-section">
              <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h2 className="heading-md">{t('haulageRouteAnalysisHeading')}</h2>
                <span className="badge badge-muted">{t('openStreetMapCompatible')}</span>
              </div>

              <p className="body-sm text-muted mb-md">
                {t('originMappedAgainstYard', { origin: normalizedListing?.location || 'Origin Farm', destination: normalizedBuyer.location })}
              </p>

              <Suspense
                fallback={
                  <div className="route-map-loading">
                    <LoadingSpinner label={t('calculatingRoute')} />
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
                <h2 className="heading-md">{t('algorithmicEvaluationTitle')}</h2>
                <span className="badge badge-green">
                  {t('matchFormulaWeightBadge')}
                </span>
              </div>

              <div className="match-factors">
                <div className="match-factor">
                  <div className="flex justify-between mb-xs">
                    <span className="font-medium body-sm">{t('batchQuantityAlignment')}</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.quantityFit || 0) * 100)}% ({matchResult?.weightedPoints?.quantity || 0} / 40 {t('pointsUnit')})
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
                    <span className="font-medium body-sm">{t('proximityTransitEfficiency')}</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.proximityFit || 0) * 100)}% ({matchResult?.weightedPoints?.proximity || 0} / 30 {t('pointsUnit')})
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
                    <span className="font-medium body-sm">{t('intakeCapacityHeadroom')}</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.capacityFit || 0) * 100)}% ({matchResult?.weightedPoints?.capacity || 0} / 20 {t('pointsUnit')})
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
                    <span className="font-medium body-sm">{t('industrialSynergy')}</span>
                    <span className="font-semibold body-sm text-forest">
                      {Math.round((matchResult?.scores?.useCaseFit || 0) * 100)}% ({matchResult?.weightedPoints?.useCase || 0} / 10 {t('pointsUnit')})
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
            </section>

            {/* Accepted Feedstocks */}
            <section className="card details-section">
              <h2 className="heading-md mb-sm">{t('permittedBiomassSpecies')}</h2>
              <div className="tag-list">
                {normalizedBuyer.acceptedTypes.map((tType) => (
                  <span
                    key={tType}
                    className={`badge ${normalizedListing?.residueType === tType ? 'badge-green font-semibold' : 'badge-muted'}`}
                    style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                  >
                    {normalizedListing?.residueType === tType && '✓ '}
                    {tResidue(tType)}
                  </span>
                ))}
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
                    <span>{t('inquiryLoggedBadge')}</span>
                  </div>
                  <h3 className="heading-md text-forest mt-xs">{t('inquiryTransmittedHeading')}</h3>
                  <p className="body-sm text-muted mt-xs">
                    {t('inquiryConfirmationBody', {
                      requestType: requestType === 'pickup' ? t('pickupDispatchRequest') : requestType === 'quote' ? t('quoteInquiry') : t('messageWord'),
                      destination: savedRequestId ? t('persistedIntoDb') : t('recordedForDemoSession')
                    })}
                  </p>
                  {savedRequestId && (
                    <p className="body-sm text-muted mt-xs">
                      {t('referenceIdLabel')} <code className="record-id">{savedRequestId}</code>
                    </p>
                  )}
                  <Link to="/dashboard" className="btn btn-primary w-full mt-md">
                    {t('openOperationsDashboardBtn')}
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
                    {t('submitAdditionalNoticeBtn')}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="heading-md mb-xs">{t('submitSourcingInquiryHeading')}</h3>
                  <p className="body-sm text-muted mb-md">
                    {t('directOutreachSub', { org: normalizedBuyer.orgName })}
                  </p>

                  {dbError && <DbErrorAlert message={dbError} onRetry={() => setDbError(null)} />}

                  <form onSubmit={handleSendRequest}>
                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor="requestType">{t('inquiryProtocolLabel')}</label>
                      <select
                        id="requestType"
                        className="form-control"
                        value={requestType}
                        onChange={(e) => setRequestType(e.target.value)}
                        disabled={loading}
                      >
                        <option value="pickup">{t('schedulePickupOption')}</option>
                        <option value="quote">{t('requestQuoteOption')}</option>
                        <option value="contact">{t('generalInquiryOption')}</option>
                      </select>
                    </div>

                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor="requester-name">{t('representativeNameLabel')}</label>
                      <input
                        id="requester-name"
                        type="text"
                        className="form-control"
                        placeholder={t('repNamePlaceholder')}
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        disabled={loading}
                        maxLength={100}
                      />
                    </div>

                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor="requester-email">{t('officialEmailLabel')}</label>
                      <input
                        id="requester-email"
                        type="email"
                        className="form-control"
                        placeholder={t('repEmailPlaceholder')}
                        value={requesterEmail}
                        onChange={(e) => setRequesterEmail(e.target.value)}
                        disabled={loading}
                        maxLength={200}
                      />
                    </div>

                    <div className="form-group mb-md">
                      <label className="form-label" htmlFor="contact-message">
                        {t('logisticsSpecsLabel')} <span className="required">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        className={`form-control ${msgError ? 'form-control--error' : ''}`}
                        rows={4}
                        placeholder={t('logisticsSpecsPlaceholder', {
                          quantity: normalizedListing?.quantity ?? '25',
                          residue: tResidue(normalizedListing?.residueType) || 'Paddy Straw',
                          location: normalizedListing?.location ?? normalizedBuyer.location
                        })}
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); setMsgError(''); }}
                        disabled={loading}
                        maxLength={2000}
                      />
                      {msgError && <span className="form-error" role="alert">{msgError}</span>}
                      <span className="form-hint">{t('charsMinNotice', { count: message.length })}</span>
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                      {loading ? <LoadingSpinner label={t('sendingInquirySpinner')} /> : t('transmitSourcingRequestBtn')}
                    </button>
                  </form>

                  <div className="divider" style={{ marginBlock: 'var(--space-md)' }} />
                  <div className="contact-info">
                    <span className="label">{t('registeredPointOfContact')}</span>
                    <p className="body-sm text-muted mt-xs">
                      <strong>{t('emailLabel')}</strong> {normalizedBuyer.contact || 'procurement@buyer.in'}
                    </p>
                    <p className="body-sm text-muted">
                      <strong>{t('phoneLabel')}</strong> {normalizedBuyer.phone || '+91 98765 43210'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-md">
              <Link to="/matches" className="btn btn-outline w-full">
                {t('returnToMatchesCatalog')}
              </Link>
            </div>
          </FadeContent>
        </div>
      </div>
    </main>
  );
}
