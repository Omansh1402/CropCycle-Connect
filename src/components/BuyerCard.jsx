// src/components/BuyerCard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import CountUp from './reactbits/CountUp';
import './BuyerCard.css';

export default function BuyerCard({
  buyer,
  listingId,
  matchResult,
  rank,
  badgeText,
  badgeTier = 'standard',
  highlightedResidue = '',
  defaultExpanded = false,
}) {
  const [showExplanation, setShowExplanation] = useState(defaultExpanded || rank === 1);

  // Determine score and styling
  const score = matchResult ? matchResult.finalScore : (buyer.matchScore ?? 70);
  const scoreBadgeClass =
    score >= 80 ? 'score-pill--high' :
    score >= 60 ? 'score-pill--medium' : 'score-pill--low';

  const cardRankClass = rank ? `buyer-card--rank-${Math.min(rank, 3)}` : '';

  // Extract explanation details if calculated by the matching engine
  const explanation = matchResult?.explanation;
  const weighted = matchResult?.weightedPoints;
  const scores = matchResult?.scores;
  const warnings = explanation?.warnings || [];
  const commercial = matchResult?.metadata?.commercial;

  return (
    <article className={`buyer-card card ${cardRankClass}`}>
      {/* Top Bar with Rank Badge & Metadata */}
      <div className="buyer-card__top-bar">
        <div className="buyer-card__tags">
          {badgeText ? (
            <span className={`rank-badge rank-badge--${badgeTier}`}>
              {badgeText}
            </span>
          ) : (
            <span className="badge badge-muted">
              {buyer.orgType || 'Commercial Buyer'}
            </span>
          )}

          {buyer.purchasingPurpose && (
            <span className="badge badge-warm">
              {buyer.purchasingPurpose}
            </span>
          )}

          {commercial?.isInterstate && (
            <span className="badge badge-warm" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              Interstate Haulage
            </span>
          )}

          {buyer.isDemo && (
            <span className="badge badge-muted">
              Verified Reference Record
            </span>
          )}
        </div>

        <span className={`status-pill ${buyer.available ? 'status-pill--active' : 'status-pill--standby'}`}>
          <span className="status-dot-mini" />
          {buyer.available ? 'Active Intake' : 'Intake Standby'}
        </span>
      </div>

      {/* Main Header */}
      <div className="buyer-card__header">
        <div className="buyer-card__title-area">
          <h3 className="buyer-card__name">
            {buyer.orgName}
          </h3>
          <div className="buyer-card__location">
            <span>{buyer.location || 'Location unlisted'}</span>
            {matchResult?.metadata?.estimatedDistanceKm != null && (
              <span className="distance-tag">
                {matchResult.metadata.coordinateDistanceKm != null
                  ? `${matchResult.metadata.coordinateDistanceKm} km road`
                  : `${matchResult.metadata.estimatedDistanceKm} km est.`}
              </span>
            )}
          </div>
        </div>

        {/* Compatibility Score Display */}
        <div className="buyer-card__score-box">
          <div className={`score-pill ${scoreBadgeClass}`} title="5-Dimension algorithm compatibility rating">
            <span className="score-val">
              <CountUp to={score} duration={1.2} />
            </span>
            <span className="score-unit">%</span>
          </div>
          <span className="score-label">
            {score >= 80 ? 'Optimal Match' : score >= 60 ? 'Compatible' : 'Low Alignment'}
          </span>
        </div>
      </div>

      {/* Description / Facility Notes */}
      {buyer.notes && (
        <p className="buyer-card__notes body-sm">
          {buyer.notes}
        </p>
      )}

      {/* Operational Specifications Grid */}
      <div className="buyer-card__spec-grid">
        <div className="spec-col">
          <span className="spec-label">Purchasing Purpose</span>
          <span className="spec-val font-medium text-forest">{buyer.purchasingPurpose || buyer.intendedUse}</span>
        </div>
        <div className="spec-col">
          <span className="spec-label">Required Batch</span>
          <span className="spec-val">{buyer.requiredQuantity} tonnes</span>
        </div>
        <div className="spec-col">
          <span className="spec-label">Facility Max Intake</span>
          <span className="spec-val">
            {buyer.maxIntake ? `${buyer.maxIntake} tonnes` : 'Flexible Capacity'}
          </span>
        </div>
        <div className="spec-col">
          <span className="spec-label">Indicative Lot Value</span>
          <span className="spec-val">
            {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
              <span className="flex items-center gap-xs">
                <strong className="text-forest">
                  ₹{matchResult.metadata.pricing.indicativeValue?.toLocaleString('en-IN')}
                </strong>
                <span className="badge badge-green" style={{ fontSize: '0.6875rem' }}>
                  ₹{matchResult.metadata.pricing.pricePerTonne?.toLocaleString('en-IN')}/t
                </span>
              </span>
            ) : (
              <span className="badge badge-muted">
                Price upon inquiry
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Commercial Pricing & Transportation Breakdown (When Listing Linked) */}
      {commercial && (
        <div className="buyer-card__commercial-box" style={{
          backgroundColor: '#F8FAF9',
          border: '1px solid #E2E8F0',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-md)',
          marginTop: 'var(--space-xs)'
        }}>
          <div className="flex justify-between items-center mb-xs flex-wrap gap-xs">
            <span className="font-semibold body-sm text-forest">Commercial &amp; Logistics Breakdown</span>
            <span className="badge badge-muted" style={{ fontSize: '0.6875rem' }}>
              {commercial.isInterstate ? 'Interstate Delivery' : 'Intra-State / Local'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-sm body-sm mt-xs">
            <div>
              <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>Farmer Asking Price</span>
              <strong>{commercial.askingPricePerTonne != null ? `₹${commercial.askingPricePerTonne.toLocaleString('en-IN')} / t` : 'Negotiable directly'}</strong>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>Buyer Offered Rate</span>
              <strong className="text-forest">{commercial.offeredPricePerTonne != null ? `₹${commercial.offeredPricePerTonne.toLocaleString('en-IN')} / t` : 'Open to quotes'}</strong>
            </div>
            {commercial.transportEstimate && (
              <>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>Est. Freight ({commercial.transportEstimate.vehicleName})</span>
                  <span>₹{commercial.transportEstimate.transportCostPerTonne.toLocaleString('en-IN')} / t ({commercial.transportEstimate.trips} trip{commercial.transportEstimate.trips > 1 ? 's' : ''})</span>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>Delivered Cost</span>
                  <strong className="text-forest">₹{commercial.transportEstimate.deliveredCostPerTonne.toLocaleString('en-IN')} / t</strong>
                </div>
              </>
            )}
          </div>
          {commercial.transportEstimate?.disclaimer && (
            <div className="mt-xs text-muted" style={{ fontSize: '0.6875rem', fontStyle: 'italic' }}>
              {commercial.transportEstimate.disclaimer}
            </div>
          )}
        </div>
      )}

      {/* Accepted Feedstocks */}
      <div className="buyer-card__feedstocks">
        <span className="spec-label" style={{ marginBottom: '6px', display: 'block' }}>
          Accepted Crop Residues
        </span>
        <div className="tag-list">
          {buyer.acceptedTypes.map((type) => {
            const isMatch = highlightedResidue && type.toLowerCase() === highlightedResidue.toLowerCase();
            return (
              <span
                key={type}
                className={`feedstock-chip ${isMatch ? 'feedstock-chip--matched' : ''}`}
              >
                {isMatch && <span className="matched-check">✓</span>}
                {type}
              </span>
            );
          })}
        </div>
      </div>

      {/* Why This Matched Section */}
      {matchResult && (
        <div className="buyer-card__match-section">
          <button
            type="button"
            className="buyer-card__toggle-btn"
            onClick={() => setShowExplanation((prev) => !prev)}
            aria-expanded={showExplanation}
          >
            <span className="toggle-label">
              Algorithm Score Breakdown ({score}/100)
            </span>
            <span className="toggle-arrow">{showExplanation ? 'Hide' : 'Inspect'}</span>
          </button>

          {showExplanation && (
            <div className="buyer-card__breakdown">
              {/* Component Bar Breakdown */}
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Quantity Fit (40%)</span>
                    <strong>{weighted?.quantity || 0}/40 pts</strong>
                  </div>
                  <div className="breakdown-track">
                    <div
                      className="breakdown-fill"
                      style={{ width: `${Math.round((scores?.quantityFit || 0) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Proximity (30%)</span>
                    <strong>{weighted?.proximity || 0}/30 pts</strong>
                  </div>
                  <div className="breakdown-track">
                    <div
                      className="breakdown-fill"
                      style={{ width: `${Math.round((scores?.proximityFit || 0) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Capacity (20%)</span>
                    <strong>{weighted?.capacity || 0}/20 pts</strong>
                  </div>
                  <div className="breakdown-track">
                    <div
                      className="breakdown-fill"
                      style={{ width: `${Math.round((scores?.capacityFit || 0) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Use-Case (10%)</span>
                    <strong>{weighted?.useCase || 0}/10 pts</strong>
                  </div>
                  <div className="breakdown-track">
                    <div
                      className="breakdown-fill"
                      style={{ width: `${Math.round((scores?.useCaseFit || 0) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Explanatory Narratives across 5 dimensions */}
              {explanation && (
                <div className="breakdown-narratives">
                  <div className="narrative-row">
                    <span className="narrative-key">Residue</span>
                    <span className="narrative-val">{explanation.residue}</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-key">Quantity</span>
                    <span className="narrative-val">{explanation.quantity}</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-key">Distance</span>
                    <span className="narrative-val">{explanation.distance}</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-key">Capacity</span>
                    <span className="narrative-val">{explanation.capacity}</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-key">Purchasing Purpose</span>
                    <span className="narrative-val">{buyer.purchasingPurpose || explanation.useCase}</span>
                  </div>
                  {explanation.pricing && (
                    <div className="narrative-row">
                      <span className="narrative-key">Pricing</span>
                      <span className="narrative-val">{explanation.pricing}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Warnings if any */}
              {warnings.length > 0 && (
                <div className="breakdown-warnings">
                  {warnings.map((w, idx) => (
                    <div key={idx} className="warning-item">
                      <span className="warning-dot" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="buyer-card__footer">
        <Link
          to={`/match-details/${buyer.id}${listingId ? `?listing=${listingId}` : ''}`}
          className="btn btn-primary btn-sm"
        >
          View Route & Profile
        </Link>
        <Link
          to={`/match-details/${buyer.id}${listingId ? `?listing=${listingId}` : ''}#contact`}
          className="btn btn-secondary btn-sm"
        >
          Send Pickup Request
        </Link>
      </div>

      <div className="buyer-card__footnote">
        Algorithm compatibility score is computed based on distance and batch specifications. Non-binding advisory.
      </div>
    </article>
  );
}
