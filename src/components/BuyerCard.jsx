// src/components/BuyerCard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
              {buyer.orgType ? t(`orgTypes.${buyer.orgType}`, buyer.orgType) : t('buyerCard.commercialBuyer')}
            </span>
          )}

          {buyer.isDemo && (
            <span className="badge badge-muted">
              {t('buyerCard.verifiedRecord')}
            </span>
          )}
        </div>

        <span className={`status-pill ${buyer.available ? 'status-pill--active' : 'status-pill--standby'}`}>
          <span className="status-dot-mini" />
          {buyer.available ? t('buyerCard.activeIntake') : t('buyerCard.intakeStandby')}
        </span>
      </div>

      {/* Main Header */}
      <div className="buyer-card__header">
        <div className="buyer-card__title-area">
          <h3 className="buyer-card__name">
            {buyer.orgName}
          </h3>
          <div className="buyer-card__location">
            <span>{buyer.location || t('buyerCard.locationUnlisted')}</span>
            {matchResult?.metadata?.estimatedDistanceKm != null && (
              <span className="distance-tag">
                {matchResult.metadata.coordinateDistanceKm != null
                  ? t('buyerCard.exactDistance', { km: matchResult.metadata.coordinateDistanceKm })
                  : t('buyerCard.estDistance', { km: matchResult.metadata.estimatedDistanceKm })}
              </span>
            )}
          </div>
        </div>

        {/* Compatibility Score Display */}
        <div className="buyer-card__score-box">
          <div className={`score-pill ${scoreBadgeClass}`} title={t('buyerCard.scoreTitle')}>
            <span className="score-val">
              <CountUp to={score} duration={1.2} />
            </span>
            <span className="score-unit">%</span>
          </div>
          <span className="score-label">
            {score >= 80
              ? t('buyerCard.optimalMatch')
              : score >= 60
              ? t('buyerCard.compatible')
              : t('buyerCard.lowAlignment')}
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
          <span className="spec-label">{t('buyerCard.targetApplication')}</span>
          <span className="spec-val">
            {buyer.intendedUse ? t(`uses.${buyer.intendedUse}`, buyer.intendedUse) : '—'}
          </span>
        </div>
        <div className="spec-col">
          <span className="spec-label">{t('buyerCard.requiredBatch')}</span>
          <span className="spec-val">{buyer.requiredQuantity} {t('common.tonnes', 'tonnes')}</span>
        </div>
        <div className="spec-col">
          <span className="spec-label">{t('buyerCard.facilityMaxIntake')}</span>
          <span className="spec-val">
            {buyer.maxIntake ? `${buyer.maxIntake} ${t('common.tonnes', 'tonnes')}` : t('buyer.flexibleCapacity', 'Flexible Capacity')}
          </span>
        </div>
        <div className="spec-col">
          <span className="spec-label">{t('buyerCard.indicativeLotValue')}</span>
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
                {t('buyerCard.priceUponInquiry')}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Accepted Feedstocks */}
      <div className="buyer-card__feedstocks">
        <span className="spec-label" style={{ marginBottom: '6px', display: 'block' }}>
          {t('buyerCard.acceptedResidues')}
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
                {t(`crops.${type}`, type)}
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
              {t('buyerCard.scoreBreakdown', { score })}
            </span>
            <span className="toggle-arrow">{showExplanation ? t('buyerCard.hide') : t('buyerCard.inspect')}</span>
          </button>

          {showExplanation && (
            <div className="buyer-card__breakdown">
              {/* Component Bar Breakdown */}
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>{t('buyerCard.quantityFit')}</span>
                    <strong>{weighted?.quantity || 0}/40 {t('common.pts', 'pts')}</strong>
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
                    <span>{t('buyerCard.proximityFit')}</span>
                    <strong>{weighted?.proximity || 0}/30 {t('common.pts', 'pts')}</strong>
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
                    <span>{t('buyerCard.capacityFit')}</span>
                    <strong>{weighted?.capacity || 0}/20 {t('common.pts', 'pts')}</strong>
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
                    <span>{t('buyerCard.useCaseFit')}</span>
                    <strong>{weighted?.useCase || 0}/10 {t('common.pts', 'pts')}</strong>
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
                    <span className="narrative-key">{t('buyerCard.residueKey')}</span>
                    <span className="narrative-val">{explanation.residue}</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-key">{t('buyerCard.quantityKey')}</span>
                    <span className="narrative-val">{explanation.quantity}</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-key">{t('buyerCard.distanceKey')}</span>
                    <span className="narrative-val">{explanation.distance}</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-key">{t('buyerCard.capacityKey')}</span>
                    <span className="narrative-val">{explanation.capacity}</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-key">{t('buyerCard.useCaseKey')}</span>
                    <span className="narrative-val">{explanation.useCase}</span>
                  </div>
                  {explanation.pricing && (
                    <div className="narrative-row">
                      <span className="narrative-key">{t('buyerCard.pricingKey')}</span>
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
          {t('buyerCard.btnViewRoute')}
        </Link>
        <Link
          to={`/match-details/${buyer.id}${listingId ? `?listing=${listingId}` : ''}#contact`}
          className="btn btn-secondary btn-sm"
        >
          {t('buyerCard.btnSendRequest')}
        </Link>
      </div>

      <div className="buyer-card__footnote">
        {t('buyerCard.footnote')}
      </div>
    </article>
  );
}
