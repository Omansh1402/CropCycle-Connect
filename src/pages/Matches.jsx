// src/pages/Matches.jsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sampleBuyers, sampleListings, RESIDUE_TYPES } from '../data/sampleData';
import { fetchFarmerListings, fetchBuyerRequirements, formatDbError } from '../lib/db';
import {
  matchListingWithBuyers,
  normalizeListing,
  normalizeBuyer,
  findCollectionGroupings,
} from '../lib/matchingEngine';
import BuyerCard from '../components/BuyerCard';
import { LoadingSpinner, DbErrorAlert } from '../components/DbStatus';
import SplitText from '../components/reactbits/SplitText';
import FadeContent from '../components/reactbits/FadeContent';
import './Matches.css';

export default function Matches() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialListingId = searchParams.get('listing');

  // Database state
  const [dbListings, setDbListings] = useState([]);
  const [dbBuyers, setDbBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [dataSource, setDataSource] = useState('loading'); // 'supabase' | 'sample' | 'mixed'

  // Selected listing state
  const [activeListingId, setActiveListingId] = useState(initialListingId || '');
  const [testQuantityOverride, setTestQuantityOverride] = useState(null);

  // Filters & sorting
  const [filterType, setFilterType] = useState('All');
  const [filterAvail, setFilterAvail] = useState('All');
  const [sortBy, setSortBy] = useState('matchScore');
  const [showIncompatible, setShowIncompatible] = useState(false);

  // ─── Fetch data on mount ───────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setDbError(null);

      try {
        const [listingsRes, buyersRes] = await Promise.all([
          fetchFarmerListings(),
          fetchBuyerRequirements(),
        ]);

        if (!isMounted) return;

        let hasRealListings = false;
        let hasRealBuyers = false;

        // Process listings
        if (listingsRes && !listingsRes.error && Array.isArray(listingsRes.data) && listingsRes.data.length > 0) {
          setDbListings(listingsRes.data);
          hasRealListings = true;
        }

        // Process buyers
        if (buyersRes && !buyersRes.error && Array.isArray(buyersRes.data) && buyersRes.data.length > 0) {
          setDbBuyers(buyersRes.data);
          hasRealBuyers = true;
        }

        if (listingsRes?.error && listingsRes.error.code !== 'NOT_CONFIGURED') {
          setDbError(formatDbError(listingsRes.error));
        }

        if (hasRealListings || hasRealBuyers) {
          setDataSource('supabase');
        } else {
          setDataSource('sample');
        }
      } catch {
        if (isMounted) {
          setDbError(t('dashboard.couldNotReachRemote', 'Could not reach remote database. Using local sample catalog.'));
          setDataSource('sample');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [t]);

  // ─── Unified listings pool with safe deterministic deduplication ───
  const combinedListings = useMemo(() => {
    const list = [];
    if (dbListings.length > 0) {
      dbListings.forEach((item) => list.push(normalizeListing(item)));
    }
    sampleListings.forEach((item) => {
      const isAlreadyPresent = list.some((existing) => {
        if (existing.id === item.id) return true;
        if (existing.isDemo && item.isDemo) {
          const cleanExisting = String(existing.farmerName || '').replace(/\s*\[DEMO\]\s*/gi, '').trim().toLowerCase();
          const cleanItem = String(item.farmerName || '').replace(/\s*\[DEMO\]\s*/gi, '').trim().toLowerCase();
          return cleanExisting === cleanItem && existing.residueType === item.residueType;
        }
        return false;
      });

      if (!isAlreadyPresent) {
        list.push(normalizeListing(item));
      }
    });
    return list;
  }, [dbListings]);

  // ─── Unified buyers pool with safe deterministic deduplication ───
  const combinedBuyers = useMemo(() => {
    const buyers = [];
    if (dbBuyers.length > 0) {
      dbBuyers.forEach((b) => buyers.push(normalizeBuyer(b)));
    }
    sampleBuyers.forEach((b) => {
      const normSample = normalizeBuyer(b);
      const isAlreadyPresent = buyers.some((existing) => {
        if (existing.id === normSample.id) return true;
        if (existing.isDemo && normSample.isDemo) {
          const cleanExisting = String(existing.orgName || '').replace(/\s*\[DEMO\]\s*/gi, '').replace(/\s+(pvt\.?|ltd\.?|limited|cooperative|llc|inc)\b/gi, '').trim().toLowerCase();
          const cleanSample = String(normSample.orgName || '').replace(/\s*\[DEMO\]\s*/gi, '').replace(/\s+(pvt\.?|ltd\.?|limited|cooperative|llc|inc)\b/gi, '').trim().toLowerCase();
          return cleanExisting === cleanSample;
        }
        return false;
      });

      if (!isAlreadyPresent) {
        buyers.push(normSample);
      }
    });
    return buyers;
  }, [dbBuyers]);

  // Determine active listing
  const effectiveActiveListingId = useMemo(() => {
    if (activeListingId && combinedListings.some((l) => l.id === activeListingId)) {
      return activeListingId;
    }
    return combinedListings[0]?.id || '';
  }, [activeListingId, combinedListings]);

  const currentListing = useMemo(() => {
    const found = combinedListings.find((l) => l.id === effectiveActiveListingId);
    if (!found) return null;

    if (testQuantityOverride !== null) {
      return {
        ...found,
        quantity: testQuantityOverride,
        quantity_tonnes: testQuantityOverride,
      };
    }
    return found;
  }, [effectiveActiveListingId, combinedListings, testQuantityOverride]);

  const baseQuantity = useMemo(() => {
    const original = combinedListings.find((l) => l.id === effectiveActiveListingId);
    return original ? Number(original.quantity) : 25;
  }, [effectiveActiveListingId, combinedListings]);

  const sliderMax = Math.max(150, Math.ceil(baseQuantity * 3));
  const sliderStep = baseQuantity > 50 ? 5 : 1;

  // Compute match report using matching engine
  const matchReport = useMemo(() => {
    if (!currentListing) {
      return {
        rankedMatches: [],
        topMatches: [],
        incompatibleBuyers: [],
        totalEvaluated: 0,
        compatibleCount: 0,
      };
    }
    return matchListingWithBuyers(currentListing, combinedBuyers);
  }, [currentListing, combinedBuyers]);

  // Compute Suggested Collection Opportunities
  const collectionOpportunities = useMemo(() => {
    return findCollectionGroupings(combinedListings, combinedBuyers);
  }, [combinedListings, combinedBuyers]);

  // Filter & sort matches according to UI controls
  const filteredMatches = useMemo(() => {
    return matchReport.rankedMatches
      .filter(({ buyer }) => {
        if (filterType !== 'All' && !buyer.acceptedTypes.includes(filterType)) return false;
        if (filterAvail === 'Active' && !buyer.available) return false;
        if (filterAvail === 'Unavailable' && buyer.available) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'matchScore') return b.matchResult.finalScore - a.matchResult.finalScore;
        if (sortBy === 'quantity') return b.buyer.requiredQuantity - a.buyer.requiredQuantity;
        if (sortBy === 'proximity') {
          return (b.matchResult.scores.proximityFit || 0) - (a.matchResult.scores.proximityFit || 0);
        }
        return a.buyer.orgName.localeCompare(b.buyer.orgName);
      });
  }, [matchReport.rankedMatches, filterType, filterAvail, sortBy]);

  const residueFilterOptions = ['All', ...RESIDUE_TYPES.slice(0, 7)];

  const handleSelectListing = (id) => {
    setActiveListingId(id);
    setTestQuantityOverride(null);
    setSearchParams({ listing: id }, { replace: true });
  };

  return (
    <main className="matches-page">
      <header className="page-header">
        <div className="container">
          <div className="page-header__inner">
            <span className="section-eyebrow">{t('matches.engineVersion')}</span>
            <SplitText
              key={`matches-headline-${i18n.language}`}
              text={t('matches.title')}
              tag="h1"
              className="display-lg"
              delay={0.03}
            />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '640px' }}>
              {t('matches.subtitle')}
            </p>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        {/* Data Source & Status Bar */}
        <div className="matches-source-bar">
          <div className="matches-source-left">
            <span
              className={`matches-source-dot ${
                dataSource === 'supabase' ? 'matches-source-dot--live' : 'matches-source-dot--demo'
              }`}
            />
            <span className="font-semibold">
              {dataSource === 'supabase'
                ? t('matches.connectedLive')
                : t('matches.indexedDemo')}
            </span>
            <span className="text-muted">
              {t('matches.buyersEvaluated', { count: matchReport.totalEvaluated })}
            </span>
          </div>

          <div className="flex items-center gap-sm">
            <span className="badge badge-green">
              {t('matches.fourFactorBadge')}
            </span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              {t('matches.weightsBreakdown')}
            </span>
          </div>
        </div>

        {dbError && (
          <div className="mb-md">
            <DbErrorAlert message={dbError} />
          </div>
        )}

        {/* Active Listing Selector Bar */}
        <FadeContent delay={0.1} distance={18} className="matches-listing-bar card mb-xl">
          <div className="matches-listing-bar__top">
            <div style={{ flex: 1 }}>
              <div className="flex items-center justify-between gap-md mb-sm flex-wrap">
                <span className="label">
                  {t('matches.activeListingEvaluated')}
                </span>
                <Link to="/farmer" className="btn btn-outline btn-sm">
                  {t('matches.registerNewListing')}
                </Link>
              </div>

              <div className="listing-chips-container">
                {combinedListings.map((l) => (
                  <button
                    key={l.id}
                    className={`listing-chip ${effectiveActiveListingId === l.id ? 'listing-chip--active' : ''}`}
                    onClick={() => handleSelectListing(l.id)}
                    type="button"
                  >
                    <span className="font-medium">{t(`crops.${l.residueType}`, l.residueType)}</span>
                    <span className="listing-chip-meta">
                      {l.quantity}t · {l.district || l.state || l.location}
                    </span>
                    {l.isDemo ? (
                      <span className="chip-demo-tag">{t('matches.demoChip')}</span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>
                        {t('matches.liveChip')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Listing Details */}
            {currentListing && (
              <div className="matches-listing-meta">
                <div className="matches-listing-meta-item">
                  <span className="label">{t('matches.residue')}</span>
                  <div className="heading-sm text-forest font-semibold mt-xs">
                    {t(`crops.${currentListing.residueType}`, currentListing.residueType)}
                  </div>
                </div>
                <div className="matches-listing-meta-item">
                  <span className="label">{t('matches.batchVolume')}</span>
                  <div className="heading-sm font-semibold mt-xs">
                    {currentListing.quantity} {t('common.tonnes', 'tonnes')}
                  </div>
                </div>
                <div className="matches-listing-meta-item">
                  <span className="label">{t('matches.origin')}</span>
                  <div className="heading-sm mt-xs">
                    {currentListing.district ? `${currentListing.district}, ` : ''}{currentListing.state || currentListing.location}
                  </div>
                </div>
                <div className="matches-listing-meta-item">
                  <span className="label">{t('matches.haulage')}</span>
                  <div className="heading-sm mt-xs">
                    {t(`pickup.${currentListing.pickupPreference}`, currentListing.pickupPreference)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Sensitivity Testing Slider */}
          {currentListing && (
            <div className="matches-sensitivity-box">
              <div className="matches-sensitivity-left">
                <span className="heading-sm" style={{ fontSize: '0.84375rem' }}>
                  {t('matches.sensitivityTitle')}
                </span>
                <span className="body-sm text-muted">
                  {t('matches.sensitivityDesc')}
                </span>
              </div>
              <div className="slider-group">
                <input
                  type="range"
                  min="1"
                  max={sliderMax}
                  step={sliderStep}
                  value={currentListing.quantity}
                  onChange={(e) => setTestQuantityOverride(Number(e.target.value))}
                  aria-label={t('matches.sensitivityTitle')}
                  style={{ width: '130px', accentColor: 'var(--color-forest)' }}
                />
                <span className="heading-sm text-forest" style={{ minWidth: '60px' }}>
                  {currentListing.quantity} t
                </span>
                {testQuantityOverride !== null && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    onClick={() => setTestQuantityOverride(null)}
                  >
                    {t('common.reset', 'Reset')}
                  </button>
                )}
              </div>
            </div>
          )}
        </FadeContent>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center p-xl">
            <LoadingSpinner label={t('matches.evaluatingCandidates')} />
          </div>
        )}

        {!loading && (
          <>
            {/* Collection Grouping Opportunities */}
            {collectionOpportunities.length > 0 && (
              <FadeContent delay={0.15} distance={18} className="collection-groupings-card card mb-xl">
                <div className="flex justify-between items-center flex-wrap gap-sm mb-md">
                  <div>
                    <span className="badge badge-warm">
                      {t('matches.logisticsAggregation')}
                    </span>
                    <h2 className="heading-md mt-xs">{t('matches.consolidatedTitle')}</h2>
                    <p className="body-sm text-muted">
                      {t('matches.consolidatedDesc')}
                    </p>
                  </div>
                  <span className="badge badge-muted">
                    {collectionOpportunities.length} {t('common.groupings', 'Grouping(s)')}
                  </span>
                </div>

                <div className="collection-grid">
                  {collectionOpportunities.slice(0, 3).map((opp) => (
                    <div key={opp.id} className="collection-item card">
                      <div className="flex justify-between items-start gap-sm">
                        <div>
                          <span className="badge badge-green">
                            {t(`crops.${opp.residueType}`, opp.residueType)}
                          </span>
                          <h4 className="heading-sm mt-xs">{opp.clusterLocation}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-forest font-semibold" style={{ fontSize: '1.25rem' }}>
                            {opp.totalQuantityTonnes}t
                          </span>
                          <p className="body-sm text-muted">({opp.farmerCount} {t('common.farmers', 'farmers')})</p>
                        </div>
                      </div>

                      <div className="collection-target mt-sm">
                        <span className="label">{t('matches.targetIndustrialDemand')}</span>
                        <p className="font-semibold mt-xs">{opp.targetBuyer.orgName}</p>
                        <div className="flex items-center gap-xs mt-xs flex-wrap">
                          <span className="badge badge-muted">
                            {t('matches.intakeTarget', { qty: opp.targetBuyer.requiredQuantity, pct: opp.fulfillmentPct })}
                          </span>
                          {opp.indicativeLotValue && (
                            <span className="badge badge-green">
                              {t('matches.estBatch', { val: opp.indicativeLotValue.toLocaleString('en-IN') })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="collection-farmers mt-sm">
                        <span className="label" style={{ display: 'block', marginBottom: '4px' }}>
                          {t('matches.aggregatedLots')}
                        </span>
                        <div className="flex flex-col gap-xs">
                          {opp.participatingListings.map((p) => (
                            <div key={p.id} className="participating-row">
                              <span>{p.farmerName} ({p.location})</span>
                              <strong>{p.quantity} {t('common.tonnes', 'tonnes')}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-sm">
                        <p className="body-sm text-muted" style={{ fontStyle: 'italic', lineHeight: 1.4 }}>
                          {opp.disclaimer}
                        </p>
                      </div>

                      <Link
                        to={`/match-details/${opp.targetBuyer.id}?listing=${opp.participatingListings[0].id}`}
                        className="btn btn-outline btn-sm w-full mt-sm"
                      >
                        {t('matches.inspectRouteProfile')}
                      </Link>
                    </div>
                  ))}
                </div>
              </FadeContent>
            )}

            {/* Top 3 Recommended Matches Showcase */}
            {matchReport.topMatches.length > 0 && filterType === 'All' && (
              <FadeContent delay={0.2} distance={20} className="top-matches-showcase mb-xl">
                <div className="top-matches-header">
                  <div>
                    <span className="section-eyebrow">{t('matches.topRecommendations')}</span>
                    <h2 className="heading-md mt-xs">{t('matches.rankedCandidates')}</h2>
                    <p className="body-sm text-muted">
                      {t('matches.topSubtitle', {
                        type: currentListing ? t(`crops.${currentListing.residueType}`, currentListing.residueType) : '',
                        qty: currentListing?.quantity || 0,
                      })}
                    </p>
                  </div>
                  <div className="badge badge-green">
                    {t('matches.rankedComposite')}
                  </div>
                </div>

                <div className="top-matches-grid">
                  {matchReport.topMatches.map((item) => (
                    <BuyerCard
                      key={item.buyer.id}
                      buyer={item.buyer}
                      listingId={currentListing?.id}
                      matchResult={item.matchResult}
                      rank={item.rank}
                      badgeText={item.badgeText}
                      badgeTier={item.badgeTier}
                      highlightedResidue={currentListing?.residueType}
                      defaultExpanded={item.rank === 1}
                    />
                  ))}
                </div>
              </FadeContent>
            )}

            {/* Filter and Directory Controls */}
            <div className="matches-filters">
              <div className="matches-filter-group">
                <span className="label" style={{ marginRight: '6px', whiteSpace: 'nowrap' }}>
                  {t('matches.residueFilter')}
                </span>
                <div className="tag-list">
                  {residueFilterOptions.map((tVal) => (
                    <button
                      key={tVal}
                      type="button"
                      className={`filter-tab ${filterType === tVal ? 'active' : ''}`}
                      onClick={() => setFilterType(tVal)}
                    >
                      {tVal === 'All' ? t('common.all', 'All') : t(`crops.${tVal}`, tVal)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="matches-filter-right">
                <select
                  className="form-control"
                  style={{ width: 'auto' }}
                  value={filterAvail}
                  onChange={(e) => setFilterAvail(e.target.value)}
                  aria-label="Filter by availability"
                >
                  <option value="All">{t('matches.allIntakes')}</option>
                  <option value="Active">{t('matches.activeIntakeOnly')}</option>
                  <option value="Unavailable">{t('matches.intakeOnHold')}</option>
                </select>

                <select
                  className="form-control"
                  style={{ width: 'auto' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort candidates"
                >
                  <option value="matchScore">{t('matches.sortScore')}</option>
                  <option value="proximity">{t('matches.sortProximity')}</option>
                  <option value="quantity">{t('matches.sortQuantity')}</option>
                  <option value="name">{t('matches.sortName')}</option>
                </select>
              </div>
            </div>

            {/* Compatible Matches Header */}
            <div className="matches-count flex items-center justify-between flex-wrap gap-md mb-md">
              <div className="flex items-center gap-sm">
                <h3 className="heading-md">
                  {t('matches.allCompatibleBuyers', { count: filteredMatches.length })}
                </h3>
                {filterType !== 'All' && (
                  <span className="badge badge-green">
                    {t('matches.filteringBadge', { type: t(`crops.${filterType}`, filterType) })}
                  </span>
                )}
              </div>
              <span className="body-sm text-muted">
                {t('matches.passingVerification')}
              </span>
            </div>

            {/* Grid of Results */}
            {filteredMatches.length > 0 ? (
              <div className="matches-grid">
                {filteredMatches.map((item) => (
                  <BuyerCard
                    key={item.buyer.id}
                    buyer={item.buyer}
                    listingId={currentListing?.id}
                    matchResult={item.matchResult}
                    rank={item.rank}
                    badgeText={item.badgeText}
                    badgeTier={item.badgeTier}
                    highlightedResidue={currentListing?.residueType}
                    defaultExpanded={false}
                  />
                ))}
              </div>
            ) : (
              /* Edge Case — No compatible buyers */
              <div className="matches-empty card">
                <h3 className="heading-md">{t('matches.noCompatibleTitle')}</h3>
                <p className="body-md text-muted" style={{ maxWidth: '480px' }}>
                  {t('matches.noCompatibleDesc', {
                    type: currentListing ? t(`crops.${currentListing.residueType}`, currentListing.residueType) : t('matches.thisResidue'),
                  })}
                </p>
                <div className="flex gap-sm mt-md flex-wrap justify-center">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setFilterType('All');
                      setFilterAvail('All');
                    }}
                  >
                    {t('matches.resetFilters')}
                  </button>
                  <Link to="/farmer" className="btn btn-primary">
                    {t('matches.registerAlternate')}
                  </Link>
                </div>
              </div>
            )}

            {/* Incompatible / Excluded Candidates Section */}
            {matchReport.incompatibleBuyers.length > 0 && (
              <div className="incompatible-section card mt-2xl">
                <button
                  type="button"
                  className="incompatible-toggle-btn"
                  onClick={() => setShowIncompatible((prev) => !prev)}
                  aria-expanded={showIncompatible}
                >
                  <div className="incompatible-toggle-left">
                    <span className="incompatible-badge">{t('matches.excludedBadge')}</span>
                    <div>
                      <h4 className="heading-sm">
                        {t('matches.excludedTitle', { count: matchReport.incompatibleBuyers.length })}
                      </h4>
                      <p className="body-sm text-muted">
                        {t('matches.excludedDesc')}
                      </p>
                    </div>
                  </div>
                  <span className="btn btn-outline btn-sm">
                    {showIncompatible ? t('matches.hideExcluded') : t('matches.inspectCriteria')}
                  </span>
                </button>

                {showIncompatible && (
                  <div className="incompatible-list">
                    {matchReport.incompatibleBuyers.map(({ buyer, matchResult }) => (
                      <div key={buyer.id} className="incompatible-row">
                        <div className="incompatible-buyer-info">
                          <span className="font-semibold">
                            {buyer.orgName}
                          </span>
                          <span className="body-sm text-muted">
                            {buyer.location || t('buyerCard.locationUnlisted')} · {t('matches.outputLabel', { use: buyer.intendedUse ? t(`uses.${buyer.intendedUse}`, buyer.intendedUse) : '—' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-xs flex-wrap">
                          {matchResult.incompatibleReasons.map((reason, i) => (
                            <span key={i} className="incompatible-reason-badge">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
