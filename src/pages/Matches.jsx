// src/pages/Matches.jsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { sampleBuyers, sampleListings, RESIDUE_TYPES } from '../data/sampleData';
import { fetchFarmerListings, fetchBuyerRequirements, formatDbError } from '../lib/db';
import { matchListingWithBuyers, normalizeListing, findCollectionGroupings } from '../lib/matchingEngine';
import BuyerCard from '../components/BuyerCard';
import { LoadingSpinner, DbErrorAlert } from '../components/DbStatus';
import './Matches.css';

export default function Matches() {
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
          setDbError('Could not reach remote database. Using local sample catalog.');
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
  }, []);

  // ─── Unified listings pool ──────────────────────────────────────
  const combinedListings = useMemo(() => {
    const list = [];
    // Prioritize DB listings if available
    if (dbListings.length > 0) {
      dbListings.forEach((item) => list.push(normalizeListing(item)));
    }
    // Also include demo listings so the catalog is never barren
    sampleListings.forEach((item) => {
      if (!list.some((existing) => existing.id === item.id)) {
        list.push(normalizeListing(item));
      }
    });
    return list;
  }, [dbListings]);

  // ─── Unified buyers pool ────────────────────────────────────────
  const combinedBuyers = useMemo(() => {
    const buyers = [];
    if (dbBuyers.length > 0) {
      dbBuyers.forEach((b) => buyers.push(b));
    }
    sampleBuyers.forEach((b) => {
      if (!buyers.some((existing) => existing.id === b.id)) {
        buyers.push(b);
      }
    });
    return buyers;
  }, [dbBuyers]);

  // Ensure activeListingId points to a valid listing
  useEffect(() => {
    if (combinedListings.length > 0) {
      const exists = combinedListings.some((l) => l.id === activeListingId);
      if (!exists) {
        const defaultId = combinedListings[0].id;
        setActiveListingId(defaultId);
        setSearchParams({ listing: defaultId }, { replace: true });
      }
    }
  }, [combinedListings, activeListingId, setSearchParams]);

  // Get current active listing with optional dynamic test quantity override
  const currentListing = useMemo(() => {
    const found = combinedListings.find((l) => l.id === activeListingId);
    if (!found) return null;
    if (testQuantityOverride !== null) {
      return {
        ...found,
        quantity: Number(testQuantityOverride),
      };
    }
    return found;
  }, [combinedListings, activeListingId, testQuantityOverride]);

  // ─── Execute Smart Matching Engine ──────────────────────────────
  const matchReport = useMemo(() => {
    if (!currentListing) {
      return {
        listing: null,
        rankedMatches: [],
        topMatches: [],
        incompatibleBuyers: [],
        totalEvaluated: 0,
        compatibleCount: 0,
        incompatibleCount: 0,
      };
    }
    return matchListingWithBuyers(currentListing, combinedBuyers);
  }, [currentListing, combinedBuyers]);

  // Compute Suggested Collection Opportunities (Feature 6)
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
    setTestQuantityOverride(null); // Reset manual quantity test override
    setSearchParams({ listing: id }, { replace: true });
  };

  return (
    <main className="matches-page">
      {/* Hero */}
      <div className="page-hero">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <span
            className="section-eyebrow"
            style={{
              color: 'var(--color-mint)',
              background: 'rgba(82,183,136,0.15)',
              display: 'inline-block',
            }}
          >
            Smart Matching Engine
          </span>
          <h1 className="display-lg text-white mt-md">Dynamic Buyer Matching</h1>
          <p className="body-lg mt-md" style={{ color: 'rgba(255,255,255,0.8)', maxWidth: '640px' }}>
            Multi-factor algorithm ranking verified buyers by residue type suitability,
            batch quantity fit (40%), logistics proximity (30%), yard intake capacity (20%), and circular use-case (10%).
          </p>
        </div>
      </div>

      <div className="container section-sm">
        {/* Data Source & Status Bar */}
        <div className="matches-source-bar">
          <div className="matches-source-left">
            <span
              className={`matches-source-dot ${
                dataSource === 'supabase' ? 'matches-source-dot--live' : 'matches-source-dot--demo'
              }`}
            />
            <span style={{ fontWeight: 600 }}>
              {dataSource === 'supabase'
                ? 'Connected to Supabase Database'
                : 'Local Demonstration Catalog'}
            </span>
            <span className="text-muted">
              ({matchReport.totalEvaluated} buyer organizations evaluated)
            </span>
          </div>

          <div className="flex items-center gap-sm">
            <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
              4-Factor Weighted Formula
            </span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              Q:40% | P:30% | C:20% | U:10%
            </span>
          </div>
        </div>

        {dbError && (
          <div className="mb-md">
            <DbErrorAlert message={dbError} />
          </div>
        )}

        {/* Active Listing Selector Bar */}
        <div className="matches-listing-bar card mb-xl">
          <div className="matches-listing-bar__top">
            <div style={{ flex: 1 }}>
              <div className="flex items-center justify-between gap-md mb-sm flex-wrap">
                <span className="label text-muted">
                  Select Farmer Listing to Match:
                </span>
                <Link to="/farmer" className="btn btn-outline btn-sm" style={{ padding: '2px 10px', fontSize: '0.75rem' }}>
                  + Post New Listing
                </Link>
              </div>

              <div className="listing-chips-container">
                {combinedListings.map((l) => (
                  <button
                    key={l.id}
                    className={`listing-chip ${activeListingId === l.id ? 'listing-chip--active' : ''}`}
                    onClick={() => handleSelectListing(l.id)}
                    type="button"
                  >
                    <span>{l.residueType}</span>
                    <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>
                      ({l.quantity}t — {l.district || l.state || l.location})
                    </span>
                    {l.isDemo && (
                      <span style={{ fontSize: '0.625rem', opacity: 0.7 }}>[demo]</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Listing Details */}
            {currentListing && (
              <div className="matches-listing-meta">
                <div className="matches-listing-meta-item">
                  <span className="label text-muted">Residue</span>
                  <p className="heading-sm mt-xs" style={{ color: 'var(--color-forest)' }}>
                    {currentListing.residueType}
                  </p>
                </div>
                <div className="matches-listing-meta-item">
                  <span className="label text-muted">Lot Size</span>
                  <p className="heading-sm mt-xs">
                    {currentListing.quantity} tonnes
                  </p>
                </div>
                <div className="matches-listing-meta-item">
                  <span className="label text-muted">Location</span>
                  <p className="heading-sm mt-xs" style={{ fontSize: '0.85rem' }}>
                    {currentListing.district ? `${currentListing.district}, ` : ''}{currentListing.state || currentListing.location}
                  </p>
                </div>
                <div className="matches-listing-meta-item">
                  <span className="label text-muted">Pickup</span>
                  <p className="heading-sm mt-xs" style={{ fontSize: '0.8rem' }}>
                    {currentListing.pickupPreference}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Sensitivity Testing Slider */}
          {currentListing && (
            <div className="matches-sensitivity-box">
              <div className="matches-sensitivity-left">
                <span className="heading-sm" style={{ fontSize: '0.875rem' }}>
                  🧪 Live What-If Sensitivity Test:
                </span>
                <span className="text-muted body-sm">
                  Simulate changing batch quantity to observe dynamic score recalculation:
                </span>
              </div>
              <div className="slider-group">
                <input
                  type="range"
                  min="2"
                  max="150"
                  step="2"
                  value={currentListing.quantity}
                  onChange={(e) => setTestQuantityOverride(Number(e.target.value))}
                  aria-label="Simulate lot quantity"
                  style={{ width: '130px', accentColor: 'var(--color-forest)' }}
                />
                <span className="heading-sm" style={{ minWidth: '60px', color: 'var(--color-forest)' }}>
                  {currentListing.quantity} t
                </span>
                {testQuantityOverride !== null && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    onClick={() => setTestQuantityOverride(null)}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center p-xl">
            <LoadingSpinner message="Calculating real-time candidate matches..." />
          </div>
        )}

        {!loading && (
          <>
            {/* Feature 6: Optional Collection Grouping */}
            {collectionOpportunities.length > 0 && (
              <section className="collection-groupings-card card mb-xl">
                <div className="flex justify-between items-center flex-wrap gap-sm mb-md">
                  <div>
                    <span className="badge badge-warm" style={{ fontSize: '0.75rem' }}>
                      📦 Logistics Optimization
                    </span>
                    <h2 className="heading-lg mt-xs">Suggested Collection Opportunities (Aggregate Batches)</h2>
                    <p className="body-sm text-muted">
                      Recommended groupings of compatible nearby farmer lots to fulfill commercial buyer intake minimums with shared freight.
                    </p>
                  </div>
                  <span className="badge badge-muted">
                    {collectionOpportunities.length} Opportunity{collectionOpportunities.length > 1 ? 'ies' : ''}
                  </span>
                </div>

                <div className="collection-grid">
                  {collectionOpportunities.slice(0, 3).map((opp) => (
                    <div key={opp.id} className="collection-item card">
                      <div className="flex justify-between items-start gap-sm">
                        <div>
                          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                            🌾 {opp.residueType}
                          </span>
                          <h4 className="heading-sm mt-xs">📍 {opp.clusterLocation}</h4>
                        </div>
                        <div className="text-right">
                          <span className="display-sm text-forest" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                            {opp.totalQuantityTonnes}t
                          </span>
                          <p className="body-xs text-muted">({opp.farmerCount} farmers)</p>
                        </div>
                      </div>

                      <div className="collection-target mt-sm">
                        <span className="body-xs text-muted">Target Buyer Demand:</span>
                        <p className="font-bold">{opp.targetBuyer.orgName}</p>
                        <div className="flex items-center gap-xs mt-xs flex-wrap">
                          <span className="badge badge-muted" style={{ fontSize: '0.6875rem' }}>
                            Batch Target: {opp.targetBuyer.requiredQuantity}t ({opp.fulfillmentPct}% covered)
                          </span>
                          {opp.indicativeLotValue && (
                            <span className="badge badge-green" style={{ fontSize: '0.6875rem' }}>
                              Est. Batch Value: ₹{opp.indicativeLotValue.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="collection-farmers mt-sm">
                        <span className="body-xs text-muted" style={{ display: 'block', marginBottom: '4px' }}>
                          Consolidated Farmer Lots:
                        </span>
                        <div className="flex flex-col gap-xs">
                          {opp.participatingListings.map((p) => (
                            <div key={p.id} className="flex justify-between items-center body-xs" style={{ background: '#f8faf9', padding: '4px 8px', borderRadius: '4px' }}>
                              <span>{p.farmerName} ({p.location})</span>
                              <strong>{p.quantity} tonnes</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-sm">
                        <p className="body-xs text-muted" style={{ fontStyle: 'italic', lineHeight: 1.4 }}>
                          ℹ️ {opp.disclaimer}
                        </p>
                      </div>

                      <Link
                        to={`/match-details/${opp.targetBuyer.id}?listing=${opp.participatingListings[0].id}`}
                        className="btn btn-outline btn-sm w-full mt-sm"
                      >
                        Review Opportunity & Buyer Profile →
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* STEP 3: Top 3 Matches Showcase */}
            {matchReport.topMatches.length > 0 && filterType === 'All' && (
              <section className="top-matches-showcase">
                <div className="top-matches-header">
                  <div>
                    <span className="section-eyebrow" style={{ color: 'var(--color-clay)', background: 'rgba(181,131,90,0.15)' }}>
                      Step 3 — Ranking
                    </span>
                    <h2 className="heading-lg mt-xs">Top 3 Recommended Matches</h2>
                    <p className="body-sm text-muted">
                      Highest multi-factor compatibility scores for {currentListing?.residueType} ({currentListing?.quantity} tonnes).
                    </p>
                  </div>
                  <div className="badge badge-green" style={{ padding: '6px 12px' }}>
                    Ranked by Composite Score
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
              </section>
            )}

            {/* Filter and Directory Controls */}
            <div className="matches-filters">
              <div className="matches-filter-group">
                <span className="label text-muted" style={{ marginRight: '6px', whiteSpace: 'nowrap' }}>
                  Residue Filter:
                </span>
                <div className="tag-list">
                  {residueFilterOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`tag ${filterType === t ? 'active' : ''}`}
                      onClick={() => setFilterType(t)}
                    >
                      {t}
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
                  <option value="All">All Availabilities</option>
                  <option value="Active">Active Intake Only</option>
                  <option value="Unavailable">On Hold</option>
                </select>

                <select
                  className="form-control"
                  style={{ width: 'auto' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort candidates"
                >
                  <option value="matchScore">Sort: Best Match Score</option>
                  <option value="proximity">Sort: Closest Proximity</option>
                  <option value="quantity">Sort: Required Batch Size</option>
                  <option value="name">Sort: Organization A–Z</option>
                </select>
              </div>
            </div>

            {/* Compatible Matches Section */}
            <div className="matches-count flex items-center justify-between flex-wrap gap-md">
              <div className="flex items-center gap-sm">
                <h3 className="heading-md">
                  All Compatible Buyers ({filteredMatches.length})
                </h3>
                {filterType !== 'All' && (
                  <span className="badge badge-green">Filtering: {filterType}</span>
                )}
              </div>
              <span className="body-sm text-muted">
                Showing candidates passing Step 1 compatibility checks
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
              /* Step 5: Edge Case — No compatible buyers */
              <div className="matches-empty card">
                <span style={{ fontSize: '3rem' }}>🔍</span>
                <h3 className="heading-lg">No Compatible Buyers Found</h3>
                <p className="body-md text-muted" style={{ maxWidth: '480px' }}>
                  No active buyers in the directory currently accept{' '}
                  <strong>{currentListing?.residueType || 'this residue'}</strong> or meet the
                  active intake availability criteria.
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
                    Clear Filter Constraints
                  </button>
                  <Link to="/farmer" className="btn btn-primary">
                    Create Another Listing
                  </Link>
                </div>
              </div>
            )}

            {/* Step 5: Incompatible / Excluded Candidates Collapsible Section */}
            {matchReport.incompatibleBuyers.length > 0 && (
              <div className="incompatible-section card">
                <button
                  type="button"
                  className="incompatible-toggle-btn"
                  onClick={() => setShowIncompatible((prev) => !prev)}
                  aria-expanded={showIncompatible}
                >
                  <div className="flex items-center gap-sm">
                    <span style={{ fontSize: '1.25rem' }}>🚫</span>
                    <div>
                      <h4 className="heading-sm" style={{ color: 'var(--color-charcoal)' }}>
                        Excluded / Incompatible Candidates ({matchReport.incompatibleBuyers.length})
                      </h4>
                      <p className="body-sm text-muted">
                        Organizations excluded during Step 1 compatibility evaluation
                      </p>
                    </div>
                  </div>
                  <span className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                    {showIncompatible ? '▲ Hide Exclusions' : '▼ View Exclusions'}
                  </span>
                </button>

                {showIncompatible && (
                  <div className="incompatible-list">
                    {matchReport.incompatibleBuyers.map(({ buyer, matchResult }) => (
                      <div key={buyer.id} className="incompatible-row">
                        <div className="incompatible-buyer-info">
                          <span className="heading-sm" style={{ fontSize: '0.9375rem' }}>
                            {buyer.orgName}
                          </span>
                          <span className="body-sm text-muted">
                            {buyer.location || 'Location unlisted'} • Intended use: {buyer.intendedUse}
                          </span>
                        </div>
                        <div className="flex items-center gap-sm flex-wrap">
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
