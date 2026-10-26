// src/components/BuyerCard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  const scoreClass =
    score >= 80 ? 'match-score-pill--high' :
    score >= 60 ? 'match-score-pill--medium' : 'match-score-pill--low';

  const cardRankClass = rank ? `buyer-card--rank-${Math.min(rank, 3)}` : '';

  // Extract explanation details if calculated by the matching engine
  const explanation = matchResult?.explanation;
  const weighted = matchResult?.weightedPoints;
  const scores = matchResult?.scores;
  const warnings = explanation?.warnings || [];

  return (
    <div className={`buyer-card card animate-fadeUp ${cardRankClass}`}>
      {/* Top Bar with Rank Badge & Demo tag */}
      <div className="buyer-card__top-bar">
        {badgeText ? (
          <span className={`rank-badge rank-badge--${badgeTier}`}>
            {badgeText}
          </span>
        ) : (
          <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
            {buyer.orgType || 'Commercial'}
          </span>
        )}

        {buyer.isDemo && (
          <span className="badge badge-muted" style={{ fontSize: '0.6875rem' }}>
            Demo Profile
          </span>
        )}
      </div>

      {/* Main Header */}
      <div className="buyer-card__header">
        <div className="buyer-card__icon" aria-hidden="true">
          {buyer.orgName.charAt(0)}
        </div>
        <div className="buyer-card__title">
          <h3 className="heading-md" style={{ fontSize: '1.125rem', lineHeight: 1.3 }}>
            {buyer.orgName}
          </h3>
          <div className="flex items-center gap-sm mt-xs flex-wrap">
            <span className="body-sm text-muted flex items-center gap-xs">
              📍 {buyer.location || 'Location unlisted'}
              {matchResult?.metadata?.estimatedDistanceKm != null && (
                <span className="distance-chip">
                  ({matchResult.metadata.coordinateDistanceKm != null ? `~${matchResult.metadata.coordinateDistanceKm} km` : `${matchResult.metadata.estimatedDistanceKm} km est.`})
                </span>
              )}
            </span>
            <span className={`badge ${buyer.available ? 'badge-green' : 'badge-muted'}`}>
              {buyer.available ? '● Active Intake' : '○ On Hold'}
            </span>
          </div>
        </div>

        {/* Match Score Ring/Pill */}
        <div className="buyer-card__score-wrap">
          <div className={`match-score-pill ${scoreClass}`} title="Compatibility score out of 100">
            <span>{score}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>%</span>
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', fontWeight: 600 }}>
            {score >= 80 ? 'High Fit' : score >= 60 ? 'Moderate' : 'Low Fit'}
          </span>
        </div>
      </div>

      {/* Description / Notes */}
      {buyer.notes && (
        <p className="buyer-card__desc body-sm text-muted">
          {buyer.notes}
        </p>
      )}

      {/* Key operational details & Potential Value */}
      <div className="buyer-card__details">
        <div className="buyer-card__detail-row">
          <span className="buyer-card__detail-label">Intended Output</span>
          <span className="buyer-card__detail-value">{buyer.intendedUse}</span>
        </div>
        <div className="buyer-card__detail-row">
          <span className="buyer-card__detail-label">Required Batch</span>
          <span className="buyer-card__detail-value">{buyer.requiredQuantity} tonnes</span>
        </div>
        <div className="buyer-card__detail-row">
          <span className="buyer-card__detail-label">Max Yard Intake</span>
          <span className="buyer-card__detail-value">
            {buyer.maxIntake ? `${buyer.maxIntake} tonnes` : 'Flexible / unstated'}
          </span>
        </div>
        {/* Feature 4: Potential Value calculation & Demo price label */}
        <div className="buyer-card__detail-row buyer-card__detail-row--pricing">
          <span className="buyer-card__detail-label">Potential Value</span>
          <span className="buyer-card__detail-value">
            {matchResult?.metadata?.pricing?.pricePerTonne != null ? (
              <span className="flex items-center gap-xs flex-wrap">
                <strong style={{ color: 'var(--color-forest-dark)' }}>
                  ₹{matchResult.metadata.pricing.indicativeValue?.toLocaleString('en-IN')}
                </strong>
                <span className="badge badge-green" style={{ fontSize: '0.6875rem' }}>
                  ₹{matchResult.metadata.pricing.pricePerTonne?.toLocaleString('en-IN')}/t
                </span>
                {matchResult.metadata.pricing.isDemoPrice && (
                  <span className="badge badge-warm" style={{ fontSize: '0.625rem' }}>
                    Demo Price
                  </span>
                )}
              </span>
            ) : (
              <span className="badge badge-muted" style={{ fontSize: '0.6875rem' }}>
                Price unavailable
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Accepted Feedstocks */}
      <div>
        <span className="label text-muted" style={{ display: 'block', marginBottom: '6px' }}>
          Accepted Crop Residues
        </span>
        <div className="tag-list">
          {buyer.acceptedTypes.map((type) => {
            const isMatch = highlightedResidue && type.toLowerCase() === highlightedResidue.toLowerCase();
            return (
              <span
                key={type}
                className={`badge ${isMatch ? 'badge-green tag-highlight' : 'badge-muted'}`}
                title={isMatch ? `Direct match with your listing: ${type}` : undefined}
              >
                {isMatch ? `✓ ${type}` : type}
              </span>
            );
          })}
        </div>
      </div>

      {/* Step 4: "Why This Matched" Section */}
      {matchResult && (
        <div className="mt-xs">
          <button
            type="button"
            className="buyer-card__explanation-toggle"
            onClick={() => setShowExplanation((prev) => !prev)}
            aria-expanded={showExplanation}
          >
            <span>📊 Why This Matched ({score}/100)</span>
            <span>{showExplanation ? '▲ Hide breakdown' : '▼ View explanation'}</span>
          </button>

          {showExplanation && (
            <div className="buyer-card__breakdown mt-sm">
              {/* Component Bar Breakdown */}
              <div className="breakdown-bars">
                <div className="breakdown-row">
                  <div className="breakdown-header">
                    <span className="breakdown-label">Quantity Fit (40%)</span>
                    <span className="breakdown-points">
                      {Math.round((scores?.quantityFit || 0) * 100)}% ({weighted?.quantity || 0}/40 pts)
                    </span>
                  </div>
                  <div className="breakdown-track">
                    <div
                      className="breakdown-fill"
                      style={{ width: `${Math.round((scores?.quantityFit || 0) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="breakdown-row">
                  <div className="breakdown-header">
                    <span className="breakdown-label">Proximity (30%)</span>
                    <span className="breakdown-points">
                      {Math.round((scores?.proximityFit || 0) * 100)}% ({weighted?.proximity || 0}/30 pts)
                    </span>
                  </div>
                  <div className="breakdown-track">
                    <div
                      className="breakdown-fill"
                      style={{
                        width: `${Math.round((scores?.proximityFit || 0) * 100)}%`,
                        background: '#2d6a4f',
                      }}
                    />
                  </div>
                </div>

                <div className="breakdown-row">
                  <div className="breakdown-header">
                    <span className="breakdown-label">Capacity Fit (20%)</span>
                    <span className="breakdown-points">
                      {Math.round((scores?.capacityFit || 0) * 100)}% ({weighted?.capacity || 0}/20 pts)
                    </span>
                  </div>
                  <div className="breakdown-track">
                    <div
                      className="breakdown-fill"
                      style={{
                        width: `${Math.round((scores?.capacityFit || 0) * 100)}%`,
                        background: '#52b788',
                      }}
                    />
                  </div>
                </div>

                <div className="breakdown-row">
                  <div className="breakdown-header">
                    <span className="breakdown-label">Use-Case Fit (10%)</span>
                    <span className="breakdown-points">
                      {Math.round((scores?.useCaseFit || 0) * 100)}% ({weighted?.useCase || 0}/10 pts)
                    </span>
                  </div>
                  <div className="breakdown-track">
                    <div
                      className="breakdown-fill"
                      style={{
                        width: `${Math.round((scores?.useCaseFit || 0) * 100)}%`,
                        background: '#74c69d',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Explanatory Narratives across 5 dimensions */}
              {explanation && (
                <div className="breakdown-narratives">
                  <div className="narrative-item">
                    <span className="narrative-icon">🌾</span>
                    <span className="narrative-text">
                      <strong>Residue:</strong> {explanation.residue}
                    </span>
                  </div>
                  <div className="narrative-item">
                    <span className="narrative-icon">📦</span>
                    <span className="narrative-text">
                      <strong>Quantity:</strong> {explanation.quantity}
                    </span>
                  </div>
                  <div className="narrative-item">
                    <span className="narrative-icon">📍</span>
                    <span className="narrative-text">
                      <strong>Distance:</strong> {explanation.distance}
                    </span>
                  </div>
                  <div className="narrative-item">
                    <span className="narrative-icon">🏭</span>
                    <span className="narrative-text">
                      <strong>Capacity:</strong> {explanation.capacity}
                    </span>
                  </div>
                  <div className="narrative-item">
                    <span className="narrative-icon">♻️</span>
                    <span className="narrative-text">
                      <strong>Potential Use:</strong> {explanation.useCase}
                    </span>
                  </div>
                  {explanation.pricing && (
                    <div className="narrative-item">
                      <span className="narrative-icon">💰</span>
                      <span className="narrative-text">
                        <strong>Pricing:</strong> {explanation.pricing}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Warnings if any */}
              {warnings.length > 0 && (
                <div className="flex flex-col gap-xs mt-xs">
                  {warnings.map((w, idx) => (
                    <div key={idx} className="card-warning-pill">
                      <span>⚠️</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="buyer-card__actions">
        <Link
          to={`/match-details/${buyer.id}${listingId ? `?listing=${listingId}` : ''}`}
          className="btn btn-primary btn-sm"
          style={{ flex: 1, textAlign: 'center' }}
        >
          View Details & Contact
        </Link>
        <Link
          to={`/match-details/${buyer.id}${listingId ? `?listing=${listingId}` : ''}#contact`}
          className="btn btn-outline btn-sm"
        >
          Direct Inquire
        </Link>
      </div>

      <p className="buyer-card__disclaimer">
        ℹ️ Score is a compatibility ranking based on current listing traits, not a transaction guarantee.
      </p>
    </div>
  );
}
