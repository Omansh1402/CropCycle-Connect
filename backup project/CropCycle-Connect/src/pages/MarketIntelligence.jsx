// src/pages/MarketIntelligence.jsx
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – State-Wise Crop Residue Market Intelligence
// Integrates Parts 1 to 6: Production Data, Supply vs Demand Ledger,
// Visual Analytics, Commercial Pricing, and Smart Interstate Logistics.
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ALL_INDIAN_STATES_AND_UTS,
  STATE_RESIDUE_STATISTICS,
  VERIFIED_PRICE_REFERENCES,
  BUYER_PURPOSES,
  getStateResidueData,
  getResidueTypesForState,
  calculateStatePlatformMetrics,
} from '../data/stateResidueData';
import { sampleListings, sampleBuyers, RESIDUE_TYPES } from '../data/sampleData';
import { fetchFarmerListings, fetchBuyerRequirements } from '../lib/db';
import { VEHICLE_CONFIGS, calculateTransportationCost, calculateDeliveredCost } from '../lib/transportCalculator';
import { getCoordinates, calculateRoadDistanceKm } from '../lib/geo';
import { useTranslation } from '../lib/i18n';
import SplitText from '../components/reactbits/SplitText';
import FadeContent from '../components/reactbits/FadeContent';
import './MarketIntelligence.css';

export default function MarketIntelligence() {
  const { t, tCrop, tResidue, tPurpose, tVehicle, tStatus } = useTranslation();

  // ── Filter State ──
  const [selectedState, setSelectedState] = useState('Punjab');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedResidueType, setSelectedResidueType] = useState('All');
  const [selectedPurpose, setSelectedPurpose] = useState('All');
  const [minQtyFilter, setMinQtyFilter] = useState('');
  const [maxQtyFilter, setMaxQtyFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // ── Database / Session Inventory ──
  const [listings, setListings] = useState(sampleListings);
  const [buyers, setBuyers] = useState(sampleBuyers);
  const [loadingDb, setLoadingDb] = useState(false);

  // ── Logistics Calculator State (Punjab -> Bihar default scenario) ──
  const [calcOriginState, setCalcOriginState] = useState('Punjab');
  const [calcOriginDistrict, setCalcOriginDistrict] = useState('Ludhiana');
  const [calcDestState, setCalcDestState] = useState('Bihar');
  const [calcDestDistrict, setCalcDestDistrict] = useState('Patna');
  const [calcResidueType, setCalcResidueType] = useState('Paddy Straw');
  const [calcQuantity, setCalcQuantity] = useState(100);
  const [calcVehicleTier, setCalcVehicleTier] = useState('heavy_truck');
  const [calcCustomRatePerKm, setCalcCustomRatePerKm] = useState('');
  const [calcCustomFixedCharge, setCalcCustomFixedCharge] = useState('');
  const [calcIncludeEmptyReturn, setCalcIncludeEmptyReturn] = useState(false);
  const [calcPurchasePrice, setCalcPurchasePrice] = useState(2100);
  const [calcOtherCharges, setCalcOtherCharges] = useState(0);

  // Load real records from Supabase and deduplicate with sample data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingDb(true);
      try {
        const [lRes, bRes] = await Promise.all([
          fetchFarmerListings(),
          fetchBuyerRequirements(),
        ]);

        if (isMounted) {
          if (lRes?.data && Array.isArray(lRes.data) && lRes.data.length > 0) {
            const combinedL = [...lRes.data];
            sampleListings.forEach((s) => {
              if (!combinedL.some((c) => c.id === s.id)) combinedL.push(s);
            });
            setListings(combinedL);
          }
          if (bRes?.data && Array.isArray(bRes.data) && bRes.data.length > 0) {
            const combinedB = [...bRes.data];
            sampleBuyers.forEach((s) => {
              if (!combinedB.some((c) => c.id === s.id)) combinedB.push(s);
            });
            setBuyers(combinedB);
          }
        }
      } catch (err) {
        console.warn('Using baseline sample data:', err);
      } finally {
        if (isMounted) setLoadingDb(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // ── Selected State Agricultural Data (Part 1) ──
  const stateAgriculturalData = useMemo(() => {
    return getStateResidueData(selectedState);
  }, [selectedState]);

  // Available residue types for selected state
  const availableResiduesInState = useMemo(() => {
    return getResidueTypesForState(selectedState);
  }, [selectedState]);

  // Available districts in selected state
  const availableDistricts = useMemo(() => {
    return stateAgriculturalData?.districts || [];
  }, [stateAgriculturalData]);

  // ── Supply & Demand Metrics (Part 2) ──
  const ledgerMetrics = useMemo(() => {
    return calculateStatePlatformMetrics(
      selectedState,
      selectedResidueType === 'All' ? null : selectedResidueType,
      listings,
      buyers
    );
  }, [selectedState, selectedResidueType, listings, buyers]);

  // ── Market Pricing Data (Part 4) ──
  const pricingIntelligence = useMemo(() => {
    const res = {};
    const typesToInspect = selectedResidueType !== 'All' ? [selectedResidueType] : RESIDUE_TYPES;

    typesToInspect.forEach((type) => {
      // Find active listings with asking price
      const relevantListings = listings.filter((l) => {
        const matchesType = (l.residueType || l.residue_type || '').toLowerCase() === type.toLowerCase();
        const matchesState = !selectedState || (l.state || '').toLowerCase() === selectedState.toLowerCase();
        return matchesType && matchesState && (l.status || 'active') === 'active';
      });

      const askingPrices = relevantListings
        .map((l) => Number(l.askingPricePerTonne || l.asking_price_per_tonne))
        .filter((p) => !isNaN(p) && p > 0);

      // Find active buyers offering a price
      const relevantBuyers = buyers.filter((b) => {
        let accepts = [];
        if (Array.isArray(b.acceptedTypes)) accepts = b.acceptedTypes;
        else if (Array.isArray(b.accepted_types)) accepts = b.accepted_types;
        else if (typeof b.accepted_types === 'string') accepts = b.accepted_types.split(',');
        const matchesType = accepts.some((t) => t.toLowerCase().trim() === type.toLowerCase().trim());
        const matchesState = !selectedState || (b.state || '').toLowerCase() === selectedState.toLowerCase();
        return matchesType && matchesState;
      });

      const offeredPrices = relevantBuyers
        .map((b) => Number(b.offeredPricePerTonne || b.offered_price_per_tonne))
        .filter((p) => !isNaN(p) && p > 0);

      const ref = VERIFIED_PRICE_REFERENCES[type] || null;

      const avgAsking = askingPrices.length > 0
        ? Math.round(askingPrices.reduce((a, b) => a + b, 0) / askingPrices.length)
        : null;

      const avgOffered = offeredPrices.length > 0
        ? Math.round(offeredPrices.reduce((a, b) => a + b, 0) / offeredPrices.length)
        : null;

      res[type] = {
        residueType: type,
        listingCount: relevantListings.length,
        buyerCount: relevantBuyers.length,
        avgAskingPrice: avgAsking,
        askingRange: askingPrices.length > 0
          ? { min: Math.min(...askingPrices), max: Math.max(...askingPrices) }
          : null,
        avgOfferedPrice: avgOffered,
        offeredRange: offeredPrices.length > 0
          ? { min: Math.min(...offeredPrices), max: Math.max(...offeredPrices) }
          : null,
        referenceRate: ref,
      };
    });

    return res;
  }, [selectedResidueType, selectedState, listings, buyers]);

  // ── Smart Logistics Scenario Calculator (Part 5) ──
  const logisticsCalculation = useMemo(() => {
    // 1. Resolve coordinates for exact district/location
    const originCoords = getCoordinates(calcOriginDistrict, calcOriginState);
    const destCoords = getCoordinates(calcDestDistrict, calcDestState);

    // 2. Road distance in km (not straight-line)
    const isInterstate = calcOriginState.toLowerCase().trim() !== calcDestState.toLowerCase().trim();
    let roadDist = calculateRoadDistanceKm(originCoords, destCoords);

    if (!roadDist) {
      // Fallback sensible distance based on state proximity
      roadDist = isInterstate ? 850 : 120;
    }

    const customRate = calcCustomRatePerKm !== '' ? Number(calcCustomRatePerKm) : null;
    const customFixed = calcCustomFixedCharge !== '' ? Number(calcCustomFixedCharge) : null;

    const transport = calculateTransportationCost({
      quantityTonnes: Number(calcQuantity) || 10,
      distanceKm: roadDist,
      vehicleType: calcVehicleTier,
      isInterstate,
      customRatePerKm: customRate,
      customFixedCharge: customFixed,
      includeEmptyReturn: calcIncludeEmptyReturn,
    });

    const delivered = calculateDeliveredCost({
      purchasePricePerTonne: Number(calcPurchasePrice) || 0,
      transportCostPerTonne: transport?.costPerTonne || 0,
      otherChargesPerTonne: Number(calcOtherCharges) || 0,
      quantityTonnes: Number(calcQuantity) || 10,
    });

    return {
      origin: `${calcOriginDistrict}, ${calcOriginState}`,
      destination: `${calcDestDistrict}, ${calcDestState}`,
      roadDistanceKm: roadDist,
      isInterstate,
      originCoords,
      destCoords,
      transport,
      delivered,
    };
  }, [
    calcOriginState,
    calcOriginDistrict,
    calcDestState,
    calcDestDistrict,
    calcQuantity,
    calcVehicleTier,
    calcCustomRatePerKm,
    calcCustomFixedCharge,
    calcIncludeEmptyReturn,
    calcPurchasePrice,
    calcOtherCharges,
  ]);

  // ── Commercial Matches (Part 6) ──
  const commercialMatches = useMemo(() => {
    const list = [];

    // Filter farmer listings
    const candidateListings = listings.filter((l) => {
      const lState = (l.state || '').toLowerCase().trim();
      const lDistrict = (l.district || '').toLowerCase().trim();
      const lType = (l.residueType || l.residue_type || '').toLowerCase().trim();
      const lQty = Number(l.quantity || l.quantity_tonnes || 0);
      const lStatus = (l.status || 'active').toLowerCase();

      if (selectedState && selectedState !== 'All' && lState !== selectedState.toLowerCase().trim()) return false;
      if (selectedDistrict && selectedDistrict !== 'All' && lDistrict !== selectedDistrict.toLowerCase().trim()) return false;
      if (selectedResidueType && selectedResidueType !== 'All' && lType !== selectedResidueType.toLowerCase().trim()) return false;
      if (minQtyFilter && lQty < Number(minQtyFilter)) return false;
      if (maxQtyFilter && lQty > Number(maxQtyFilter)) return false;
      if (availabilityFilter !== 'all' && lStatus !== availabilityFilter) return false;
      return true;
    });

    // Pair compatible buyers
    candidateListings.forEach((listing) => {
      const lType = (listing.residueType || listing.residue_type || '');
      const lQty = Number(listing.quantity || listing.quantity_tonnes || 0);
      const lState = listing.state || '';
      const lDistrict = listing.district || '';

      buyers.forEach((buyer) => {
        let accepts = [];
        if (Array.isArray(buyer.acceptedTypes)) accepts = buyer.acceptedTypes;
        else if (Array.isArray(buyer.accepted_types)) accepts = buyer.accepted_types;
        else if (typeof buyer.accepted_types === 'string') accepts = buyer.accepted_types.split(',');

        const acceptsType = accepts.some((t) => t.toLowerCase().trim() === lType.toLowerCase().trim());
        if (!acceptsType) return;

        const bPurpose = buyer.purchasingPurpose || buyer.intendedUse || 'Biomass Power Generation';
        if (selectedPurpose && selectedPurpose !== 'All' && bPurpose.toLowerCase() !== selectedPurpose.toLowerCase()) {
          return;
        }

        const bState = buyer.state || '';
        const bDistrict = buyer.district || '';
        const isSameDistrict = lDistrict && bDistrict && lDistrict.toLowerCase() === bDistrict.toLowerCase();
        const isSameState = lState.toLowerCase() === bState.toLowerCase();
        const isInterstate = !isSameState;

        // Priority tier: 1. same-district, 2. same-state, 3. interstate
        const priorityTier = isSameDistrict ? 1 : isSameState ? 2 : 3;

        // Road distance
        const originCoords = getCoordinates(lDistrict, lState);
        const destCoords = getCoordinates(bDistrict || buyer.location, bState);
        const roadDistance = calculateRoadDistanceKm(originCoords, destCoords) || (isSameDistrict ? 25 : isSameState ? 110 : 750);

        // Pricing
        const askingRate = Number(listing.askingPricePerTonne || listing.asking_price_per_tonne) ||
          (VERIFIED_PRICE_REFERENCES[lType]?.typicalRate || 2100);
        const offeredRate = Number(buyer.offeredPricePerTonne || buyer.offered_price_per_tonne) ||
          (VERIFIED_PRICE_REFERENCES[lType]?.typicalRate || 2100);

        // Transport
        const vTier = roadDistance > 400 || lQty > 20 ? 'heavy_truck' : roadDistance > 100 || lQty > 8 ? 'medium_truck' : roadDistance > 30 ? 'small_truck' : 'tractor_trolley';
        const trans = calculateTransportationCost({
          quantityTonnes: lQty,
          distanceKm: roadDistance,
          vehicleType: vTier,
          isInterstate,
        });

        const delivered = calculateDeliveredCost({
          purchasePricePerTonne: askingRate,
          transportCostPerTonne: trans?.costPerTonne || 0,
          quantityTonnes: lQty,
        });

        list.push({
          id: `${listing.id}-${buyer.id}`,
          listingId: listing.id,
          buyerId: buyer.id,
          farmerName: listing.farmerName || listing.farmer_name || 'Farmer Listing',
          buyerOrgName: buyer.orgName || buyer.org_name || 'Industrial Buyer',
          residueType: lType,
          availableQuantity: lQty,
          requiredQuantity: Number(buyer.requiredQuantity || buyer.required_quantity_tonnes || 0),
          sourceDistrict: lDistrict || 'Rural District',
          sourceState: lState,
          destDistrict: bDistrict || buyer.location || 'Industrial Estate',
          destState: bState,
          roadDistance,
          farmerAskingPrice: askingRate,
          buyerOfferedRate: offeredRate,
          buyerPurchasingPurpose: bPurpose,
          transportCostPerTonne: trans?.costPerTonne || 0,
          deliveredPricePerTonne: delivered?.deliveredCostPerTonne || (askingRate + (trans?.costPerTonne || 0)),
          totalEstimatedCost: delivered?.totalDeliveredCost || 0,
          priorityTier,
          isInterstate,
          vehicleTier: vTier,
          trips: trans?.trips || 1,
        });
      });
    });

    // Sort: 1. same-district, 2. same-state, 3. interstate, then by distance
    list.sort((a, b) => {
      if (a.priorityTier !== b.priorityTier) return a.priorityTier - b.priorityTier;
      return a.roadDistance - b.roadDistance;
    });

    return list;
  }, [
    listings,
    buyers,
    selectedState,
    selectedDistrict,
    selectedResidueType,
    selectedPurpose,
    minQtyFilter,
    maxQtyFilter,
    availabilityFilter,
  ]);

  return (
    <main className="market-intelligence-page">
      {/* ── Page Header ── */}
      <header className="page-header">
        <div className="container">
          <div className="flex justify-between items-start flex-wrap gap-md">
            <div>
              <span className="section-eyebrow">{t('nationalAgroBiomassIntelligence')}</span>
              <SplitText
                text={t('marketIntelligenceTitle')}
                tag="h1"
                className="display-lg"
                delay={0.02}
              />
              <p className="body-lg text-muted mt-xs" style={{ maxWidth: '720px' }}>
                {t('marketIntelligenceSubtitle')}
              </p>
            </div>
            <div className="data-source-badge-card">
              <span className="badge badge-green">{t('traceableGroundTruth')}</span>
              <div className="body-xs text-muted mt-xs">
                MoA&amp;FW (DES 2022-24) · MNRE Atlas · ICAR-IARI
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        {/* ── Universal State & Residue Filter Bar ── */}
        <section className="card filter-bar-card mb-lg" aria-label="Geographic & Residue Selector">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-md items-end">
            <div>
              <label className="form-label font-semibold" htmlFor="state-selector">
                {t('selectState')} ({t('twentyEightStatesEightUts')})
              </label>
              <select
                id="state-selector"
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrict('All');
                }}
                className="form-control"
              >
                {ALL_INDIAN_STATES_AND_UTS.map((st) => (
                  <option key={st.name} value={st.name}>
                    {st.name} ({st.type === 'state' ? 'State' : 'UT'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label font-semibold" htmlFor="district-selector">
                {t('selectDistrict')}
              </label>
              <select
                id="district-selector"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="form-control"
                disabled={availableDistricts.length === 0}
              >
                <option value="All">{t('allDistrictsOption')} ({availableDistricts.length})</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label font-semibold" htmlFor="residue-selector">
                {t('selectResidueType')}
              </label>
              <select
                id="residue-selector"
                value={selectedResidueType}
                onChange={(e) => setSelectedResidueType(e.target.value)}
                className="form-control"
              >
                <option value="All">{t('allResidueTypes')}</option>
                {RESIDUE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label font-semibold" htmlFor="purpose-selector">
                {t('buyerPurpose')}
              </label>
              <select
                id="purpose-selector"
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
                className="form-control"
              >
                <option value="All">{t('allIndustrialPurposes')}</option>
                {BUYER_PURPOSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── PART 1: STATE-WISE CROP RESIDUE PRODUCTION OVERVIEW ── */}
        <section className="card section-card mb-xl" id="production-data">
          <div className="section-header-row mb-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="badge badge-green">{t('partOneBadge')}</span>
                <h2 className="heading-lg">{t('stateWiseAgriProduction')}</h2>
              </div>
              <p className="body-sm text-muted mt-xs">
                {t('reportingRegion')}: <strong>{selectedState}</strong> · {t('reportingCycle')}: <strong>{stateAgriculturalData?.reportingYear || '2023-24'}</strong> · {t('unitsTonnesYear')}
              </p>
            </div>
            <div className="text-right">
              <span className="body-xs text-muted block">{t('groundedSourcedDataset')}:</span>
              <a
                href={stateAgriculturalData?.sourceUrl || 'https://agricoop.nic.in'}
                target="_blank"
                rel="noreferrer"
                className="body-xs text-forest font-semibold"
              >
                {stateAgriculturalData?.source || 'DES Agricultural Statistics at a Glance'} ↗
              </a>
            </div>
          </div>

          {stateAgriculturalData?.dataUnavailableReason ? (
            /* Explicit Transparent Unavailable State (Part 1 rule: no fabricated figures) */
            <div className="unavailable-data-notice card">
              <div className="badge badge-warm mb-xs">{t('officialSourcedStatus')}</div>
              <h3 className="heading-md text-muted">{stateAgriculturalData.dataUnavailableReason}</h3>
              <p className="body-sm text-muted mt-xs">
                {stateAgriculturalData.methodology}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('colMajorCropProduced')}</th>
                    <th>{t('colResidueType')}</th>
                    <th>{t('colCropProductionTonneYear')}</th>
                    <th>{t('colResidueGeneratedTonneYear')}</th>
                    <th>{t('colEstimatedUsableSurplusTonneYear')}</th>
                    <th>{t('colTechnicallyCollectableTonneYear')}</th>
                    <th>{t('colExistingUsesTonneYear')}</th>
                    <th>{t('colRemainingAvailableTonneYear')}</th>
                    <th>{t('colClassification')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stateAgriculturalData?.crops?.map((c) => {
                    const isSelected = selectedResidueType === 'All' || c.residueType === selectedResidueType;
                    if (!isSelected) return null;
                    return (
                      <tr key={c.residueType} className={selectedResidueType === c.residueType ? 'row-highlight' : ''}>
                        <td className="font-semibold">{c.cropName}</td>
                        <td className="text-forest font-medium">{c.residueType}</td>
                        <td>{c.cropProductionTonnes?.toLocaleString('en-IN') || 'Data not available'}</td>
                        <td className="font-semibold">{c.residueGeneratedTonnes?.toLocaleString('en-IN') || 'Data not available'}</td>
                        <td className="text-forest">{c.surplusTonnes?.toLocaleString('en-IN') || 'Data not available'}</td>
                        <td>{c.collectableTonnes?.toLocaleString('en-IN') || 'Data not available'}</td>
                        <td className="text-muted">{c.existingUsesTonnes?.toLocaleString('en-IN') || 'Data not available'}</td>
                        <td className="font-bold text-forest">{c.potentialAvailableTonnes?.toLocaleString('en-IN') || 'Data not available'}</td>
                        <td>
                          <span className="badge badge-muted" title={c.methodology}>
                            {c.classification ? t(c.classification) : t('scientificallyEstimated')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!stateAgriculturalData?.crops || stateAgriculturalData.crops.length === 0) && (
                    <tr>
                      <td colSpan={9} className="text-center py-lg text-muted">
                        {t('noCropRecordsFound')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="table-footnote mt-sm body-xs text-muted">
                * Note: Crop production is officially reported by DES MoA&amp;FW. Gross residue and usable surplus are scientifically estimated using ICAR-IARI RPR and surplus coefficients.
              </div>
            </div>
          )}
        </section>

        {/* ── PART 2: SUPPLY AND DEMAND ANALYTICS LEDGER ── */}
        <section className="card section-card mb-xl" id="supply-demand-ledger">
          <div className="section-header-row mb-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="badge badge-green">{t('partTwoBadge')}</span>
                <h2 className="heading-lg">{t('stateWiseSupplyDemandLedger')}</h2>
              </div>
              <p className="body-sm text-muted mt-xs">
                Clear distinction between annual statewide agricultural estimates and active live platform inventory on CropCycle Connect.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-lg">
            {/* Left Ledger: Statewide Annual Agricultural Estimates */}
            <div className="card ledger-box ledger-box--statewide">
              <div className="ledger-header">
                <span className="badge badge-muted">{t('macroAgriEstimates')}</span>
                <h3 className="heading-md mt-xs">{selectedState} Annual Residue Baseline</h3>
              </div>
              <div className="ledger-rows mt-md">
                <div className="ledger-row">
                  <span className="ledger-label">{t('ledgerTotalAgriProduction')}</span>
                  <strong className="ledger-val">
                    {ledgerMetrics.totalProduction > 0
                      ? `${ledgerMetrics.totalProduction.toLocaleString('en-IN')} t/yr`
                      : 'Data not available'}
                  </strong>
                </div>
                <div className="ledger-row">
                  <span className="ledger-label">{t('ledgerAvailableAgriSurplus')}</span>
                  <strong className="ledger-val text-forest">
                    {ledgerMetrics.availableSurplus > 0
                      ? `${ledgerMetrics.availableSurplus.toLocaleString('en-IN')} t/yr`
                      : 'Data not available'}
                  </strong>
                </div>
                <div className="ledger-row">
                  <span className="ledger-label">{t('ledgerTechCollectablePotential')}</span>
                  <span className="ledger-val">
                    {ledgerMetrics.technicallyCollectable > 0
                      ? `${ledgerMetrics.technicallyCollectable.toLocaleString('en-IN')} t/yr`
                      : 'Data not available'}
                  </span>
                </div>
                <div className="ledger-row">
                  <span className="ledger-label">{t('ledgerExistingUsesFodderFuel')}</span>
                  <span className="ledger-val text-muted">
                    {ledgerMetrics.existingUses > 0
                      ? `${ledgerMetrics.existingUses.toLocaleString('en-IN')} t/yr`
                      : 'Data not available'}
                  </span>
                </div>
                <div className="ledger-row highlight">
                  <span className="ledger-label font-semibold">{t('ledgerEstimatedExternalMarketDemand')}</span>
                  <strong className="ledger-val">
                    {ledgerMetrics.estimatedExternalMarketDemand
                      ? `${ledgerMetrics.estimatedExternalMarketDemand.toLocaleString('en-IN')} t/yr`
                      : 'Data not available'}
                  </strong>
                </div>
                {ledgerMetrics.externalDemandNote && (
                  <p className="body-xs text-muted mt-xs" style={{ fontStyle: 'italic' }}>
                    * {ledgerMetrics.externalDemandNote}
                  </p>
                )}
              </div>
            </div>

            {/* Right Ledger: Live Platform Inventory on CropCycle Connect */}
            <div className="card ledger-box ledger-box--platform">
              <div className="ledger-header">
                <span className="badge badge-green">{t('livePlatformInventory')}</span>
                <h3 className="heading-md mt-xs">{t('cropCycleVerifiedPool')}</h3>
              </div>
              <div className="ledger-rows mt-md">
                <div className="ledger-row">
                  <span className="ledger-label">{t('ledgerPlatformSupply')}</span>
                  <strong className="ledger-val text-forest">
                    {ledgerMetrics.platformSupply.toLocaleString('en-IN')} tonnes
                  </strong>
                </div>
                <div className="ledger-row">
                  <span className="ledger-label">{t('ledgerPlatformDemand')}</span>
                  <strong className="ledger-val">
                    {ledgerMetrics.platformDemand.toLocaleString('en-IN')} tonnes
                  </strong>
                </div>
                <div className="ledger-row">
                  <span className="ledger-label">{t('ledgerMatchedQuantity')}</span>
                  <strong className="ledger-val text-forest font-bold">
                    {ledgerMetrics.matchedQuantity.toLocaleString('en-IN')} tonnes
                  </strong>
                </div>
                <div className="ledger-row">
                  <span className="ledger-label">{t('ledgerUnmetDemand')}</span>
                  <span className="ledger-val text-warm font-semibold">
                    {ledgerMetrics.unmetDemand.toLocaleString('en-IN')} tonnes
                  </span>
                </div>
                <div className="ledger-row highlight">
                  <span className="ledger-label font-semibold">{t('ledgerAvailableUnmatchedSupply')}</span>
                  <strong className="ledger-val text-forest">
                    {ledgerMetrics.availableUnmatchedSupply.toLocaleString('en-IN')} tonnes
                  </strong>
                </div>
                <p className="body-xs text-muted mt-xs">
                  {t('ledgerDeduplicateFootnote')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── PART 3: VISUAL ANALYTICS CHARTS ── */}
        <section className="card section-card mb-xl" id="visual-analytics">
          <div className="section-header-row mb-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="badge badge-green">{t('partThreeBadge')}</span>
                <h2 className="heading-lg">{t('residueVisualAnalyticsBreakdown')}</h2>
              </div>
              <p className="body-sm text-muted mt-xs">
                Comparative distributions of production, surplus, platform utilization, and matched quantities.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* Chart 1: Residue Production by Type */}
            <div className="card chart-card">
              <h4 className="heading-sm mb-xs">{t('chartResidueProductionByCrop')}</h4>
              <span className="body-xs text-muted mb-md block">{t('chartAnnualEstimatedGen')}</span>
              <div className="chart-bars">
                {stateAgriculturalData?.crops?.map((c) => {
                  const maxResidue = Math.max(...(stateAgriculturalData.crops.map((x) => x.residueGeneratedTonnes || 1)));
                  const pct = Math.max(5, Math.round(((c.residueGeneratedTonnes || 0) / maxResidue) * 100));
                  return (
                    <div key={c.residueType} className="chart-bar-row">
                      <div className="chart-bar-label">
                        <span className="font-medium body-xs">{tResidue(c.residueType)}</span>
                        <span className="body-xs text-muted">{c.residueGeneratedTonnes?.toLocaleString('en-IN')} t</span>
                      </div>
                      <div className="chart-track">
                        <div className="chart-fill chart-fill--forest" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(!stateAgriculturalData?.crops || stateAgriculturalData.crops.length === 0) && (
                  <p className="body-sm text-muted text-center py-md">{t('noAgriCropsReported')}</p>
                )}
              </div>
            </div>

            {/* Chart 2: Residue Utilization Breakdown */}
            <div className="card chart-card">
              <h4 className="heading-sm mb-xs">{t('chartResidueUtilizationBreakdown')}</h4>
              <span className="body-xs text-muted mb-md block">{t('chartFodderDomesticVsSurplus')}</span>
              {ledgerMetrics.totalProduction > 0 ? (
                <div className="utilization-breakdown">
                  <div className="utilization-bar-stacked mb-sm">
                    <div
                      className="seg seg-uses"
                      style={{ width: `${Math.round((ledgerMetrics.existingUses / ledgerMetrics.totalProduction) * 100)}%` }}
                      title={`Existing Uses: ${ledgerMetrics.existingUses.toLocaleString('en-IN')} tonnes`}
                    />
                    <div
                      className="seg seg-surplus"
                      style={{ width: `${Math.round((ledgerMetrics.availableSurplus / ledgerMetrics.totalProduction) * 100)}%` }}
                      title={`Surplus: ${ledgerMetrics.availableSurplus.toLocaleString('en-IN')} tonnes`}
                    />
                  </div>
                  <div className="chart-legend-grid">
                    <div className="legend-item">
                      <span className="legend-color-dot seg-uses" />
                      <span className="body-xs">{t('existingUsesLabel')}: {((ledgerMetrics.existingUses / ledgerMetrics.totalProduction) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color-dot seg-surplus" />
                      <span className="body-xs">{t('availableSurplusLabel')}: {((ledgerMetrics.availableSurplus / ledgerMetrics.totalProduction) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="mt-md pt-sm" style={{ borderTop: '1px solid #E5E7EB' }}>
                    <span className="body-xs text-muted">{t('technicallyCollectableFraction')}</span>
                    <strong className="body-sm block text-forest">
                      {ledgerMetrics.technicallyCollectable.toLocaleString('en-IN')} tonnes/year {t('seventyFiveToEightyFiveGrossResidue')}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="body-sm text-muted text-center py-md">{t('dataNotAvailable')}</p>
              )}
            </div>

            {/* Chart 3: Live Platform Supply vs Demand */}
            <div className="card chart-card">
              <h4 className="heading-sm mb-xs">{t('chartPlatformSupplyVsDemand')}</h4>
              <span className="body-xs text-muted mb-md block">{t('chartActiveInventoryListed')}</span>
              <div className="chart-bars">
                <div className="chart-bar-row">
                  <div className="chart-bar-label">
                    <span className="font-medium body-xs">{t('chartPlatformSupplyFarmers')}</span>
                    <span className="body-xs font-semibold text-forest">{ledgerMetrics.platformSupply} t</span>
                  </div>
                  <div className="chart-track">
                    <div
                      className="chart-fill chart-fill--forest"
                      style={{ width: `${Math.min(100, Math.max(10, ledgerMetrics.platformSupply > 0 ? (ledgerMetrics.platformSupply / Math.max(ledgerMetrics.platformSupply, ledgerMetrics.platformDemand, 1)) * 100 : 0))}%` }}
                    />
                  </div>
                </div>
                <div className="chart-bar-row">
                  <div className="chart-bar-label">
                    <span className="font-medium body-xs">{t('chartPlatformDemandBuyers')}</span>
                    <span className="body-xs font-semibold">{ledgerMetrics.platformDemand} t</span>
                  </div>
                  <div className="chart-track">
                    <div
                      className="chart-fill chart-fill--warm"
                      style={{ width: `${Math.min(100, Math.max(10, ledgerMetrics.platformDemand > 0 ? (ledgerMetrics.platformDemand / Math.max(ledgerMetrics.platformSupply, ledgerMetrics.platformDemand, 1)) * 100 : 0))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 4: Matched vs Unmatched Quantity */}
            <div className="card chart-card">
              <h4 className="heading-sm mb-xs">{t('chartAllocationMatchedVsUnmatched')}</h4>
              <span className="body-xs text-muted mb-md block">{t('chartLotAllocationStatus')}</span>
              <div className="chart-bars">
                <div className="chart-bar-row">
                  <div className="chart-bar-label">
                    <span className="font-medium body-xs">{t('chartMatchedQuantity')}</span>
                    <span className="body-xs font-semibold text-forest">{ledgerMetrics.matchedQuantity} t</span>
                  </div>
                  <div className="chart-track">
                    <div
                      className="chart-fill chart-fill--forest"
                      style={{ width: `${Math.min(100, Math.max(5, (ledgerMetrics.matchedQuantity / Math.max(ledgerMetrics.platformSupply, 1)) * 100))}%` }}
                    />
                  </div>
                </div>
                <div className="chart-bar-row">
                  <div className="chart-bar-label">
                    <span className="font-medium body-xs">{t('chartAvailableUnmatchedSupply')}</span>
                    <span className="body-xs font-semibold">{ledgerMetrics.availableUnmatchedSupply} t</span>
                  </div>
                  <div className="chart-track">
                    <div
                      className="chart-fill"
                      style={{ width: `${Math.min(100, Math.max(5, (ledgerMetrics.availableUnmatchedSupply / Math.max(ledgerMetrics.platformSupply, 1)) * 100))}%`, backgroundColor: '#CBD5E1' }}
                    />
                  </div>
                </div>
                <div className="chart-bar-row">
                  <div className="chart-bar-label">
                    <span className="font-medium body-xs">{t('chartUnmetBuyerDemand')}</span>
                    <span className="body-xs font-semibold text-warm">{ledgerMetrics.unmetDemand} t</span>
                  </div>
                  <div className="chart-track">
                    <div
                      className="chart-fill chart-fill--warm"
                      style={{ width: `${Math.min(100, Math.max(5, (ledgerMetrics.unmetDemand / Math.max(ledgerMetrics.platformDemand, 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PART 4: CROP RESIDUE BUYING AND SELLING RATES ── */}
        <section className="card section-card mb-xl" id="pricing-rates">
          <div className="section-header-row mb-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="badge badge-green">{t('partFourBadge')}</span>
                <h2 className="heading-lg">{t('cropResidueBuyingSellingRates')}</h2>
              </div>
              <p className="body-sm text-muted mt-xs">
                Real asking prices, buyer quotes, and verified official benchmark tariffs. All rates in <strong>INR / tonne (₹/tonne)</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
            {Object.entries(pricingIntelligence).map(([type, p]) => (
              <div key={type} className="card pricing-tile">
                <div className="flex justify-between items-start mb-xs">
                  <h4 className="heading-sm font-semibold">{type}</h4>
                  <span className="badge badge-muted body-xs">{p.listingCount} lots</span>
                </div>

                <div className="pricing-rows body-sm mt-sm">
                  <div className="flex justify-between py-xs border-b">
                    <span className="text-muted">{t('farmerAskingRate')}</span>
                    <strong className="text-forest">
                      {p.avgAskingPrice ? `₹${p.avgAskingPrice.toLocaleString('en-IN')} / t` : t('directNegotiation')}
                    </strong>
                  </div>

                  <div className="flex justify-between py-xs border-b">
                    <span className="text-muted">{t('buyerOfferedRate')}</span>
                    <strong>
                      {p.avgOfferedPrice ? `₹${p.avgOfferedPrice.toLocaleString('en-IN')} / t` : t('openQuote')}
                    </strong>
                  </div>

                  <div className="flex justify-between py-xs border-b">
                    <span className="text-muted">{t('verifiedReferenceRate')}</span>
                    <strong className="text-forest">
                      {p.referenceRate ? `₹${p.referenceRate.typicalRate.toLocaleString('en-IN')} / t` : t('noVerifiedRate')}
                    </strong>
                  </div>

                  {p.referenceRate && (
                    <div className="mt-xs body-xs text-muted">
                      <span>{t('deliveryCondition')} {p.referenceRate.deliveryCondition}</span>
                      <span className="block mt-xxs">{t('sourceLabel')} {p.referenceRate.source} ({p.referenceRate.reportingYear})</span>
                    </div>
                  )}

                  {!p.referenceRate && !p.avgAskingPrice && !p.avgOfferedPrice && (
                    <div className="mt-xs body-xs text-muted" style={{ fontStyle: 'italic' }}>
                      {t('noVerifiedPriceNegotiate')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PART 5: SMART INTERSTATE TRANSPORTATION COST CALCULATOR ── */}
        <section className="card section-card mb-xl" id="transport-calculator">
          <div className="section-header-row mb-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="badge badge-green">{t('partFiveBadge')}</span>
                <h2 className="heading-lg">{t('smartTransportationCalculator')}</h2>
              </div>
              <p className="body-sm text-muted mt-xs">
                Compute route distance, multi-trip payload logistics, and delivered procurement costs between any two districts or states.
              </p>
            </div>
            <span className="badge badge-warm">{t('osrmRoadDistanceGrounded')}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
            {/* Controls Form */}
            <div className="card lg:col-span-1" style={{ backgroundColor: '#F8FAF9' }}>
              <h3 className="heading-sm mb-md">{t('routeFreightParameters')}</h3>

              <div className="form-group mb-sm">
                <label className="form-label font-semibold">{t('originStateFarmerLocation')}</label>
                <select
                  value={calcOriginState}
                  onChange={(e) => setCalcOriginState(e.target.value)}
                  className="form-control"
                >
                  {ALL_INDIAN_STATES_AND_UTS.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-sm">
                <label className="form-label font-semibold">{t('originDistrictTown')}</label>
                <input
                  type="text"
                  value={calcOriginDistrict}
                  onChange={(e) => setCalcOriginDistrict(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Ludhiana"
                />
              </div>

              <div className="form-group mb-sm">
                <label className="form-label font-semibold">{t('destinationStateBuyerLocation')}</label>
                <select
                  value={calcDestState}
                  onChange={(e) => setCalcDestState(e.target.value)}
                  className="form-control"
                >
                  {ALL_INDIAN_STATES_AND_UTS.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-sm">
                <label className="form-label font-semibold">{t('destinationDistrictPlant')}</label>
                <input
                  type="text"
                  value={calcDestDistrict}
                  onChange={(e) => setCalcDestDistrict(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Patna"
                />
              </div>

              <div className="grid grid-cols-2 gap-sm mb-sm">
                <div className="form-group">
                  <label className="form-label font-semibold">{t('residueType')}</label>
                  <select
                    value={calcResidueType}
                    onChange={(e) => setCalcResidueType(e.target.value)}
                    className="form-control"
                  >
                    {RESIDUE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label font-semibold">{t('lotSizeTonnes')}</label>
                  <input
                    type="number"
                    min="1"
                    value={calcQuantity}
                    onChange={(e) => setCalcQuantity(Number(e.target.value))}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group mb-sm">
                <label className="form-label font-semibold">{t('commercialVehicleProfile')}</label>
                <select
                  value={calcVehicleTier}
                  onChange={(e) => setCalcVehicleTier(e.target.value)}
                  className="form-control"
                >
                  {Object.values(VEHICLE_CONFIGS).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} ({v.payloadTonnes}T payload · ₹{v.ratePerKm}/km)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-sm mb-sm">
                <div className="form-group">
                  <label className="form-label">{t('purchasePricePerTonneLabel')}</label>
                  <input
                    type="number"
                    value={calcPurchasePrice}
                    onChange={(e) => setCalcPurchasePrice(Number(e.target.value))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('otherChargesPerTonneLabel')}</label>
                  <input
                    type="number"
                    value={calcOtherCharges}
                    onChange={(e) => setCalcOtherCharges(Number(e.target.value))}
                    className="form-control"
                    placeholder="e.g. 0"
                  />
                </div>
              </div>

              <div className="form-group mb-sm">
                <label className="flex items-center gap-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calcIncludeEmptyReturn}
                    onChange={(e) => setCalcIncludeEmptyReturn(e.target.checked)}
                  />
                  <span className="body-sm">{t('includeEmptyReturnSurcharge')}</span>
                </label>
              </div>
            </div>

            {/* Results Display */}
            <div className="lg:col-span-2">
              <div className="card mb-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <div className="flex justify-between items-center mb-md flex-wrap gap-xs">
                  <div>
                    <span className="badge badge-green">{t('scenarioEvaluationBadge')}</span>
                    <h3 className="heading-md mt-xs">
                      {logisticsCalculation.origin} → {logisticsCalculation.destination}
                    </h3>
                  </div>
                  <span className="badge badge-warm">
                    {logisticsCalculation.isInterstate ? t('interstateFreightBadge') : t('intraStateHaulageBadge')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-md">
                  <div className="card" style={{ padding: 'var(--space-md)', background: '#F8FAF9' }}>
                    <span className="body-xs text-muted">{t('roadTransitDistance')}</span>
                    <div className="heading-md text-forest mt-xs">{logisticsCalculation.roadDistanceKm} km</div>
                    <span className="body-xs text-muted">{t('osrmRoute')}</span>
                  </div>

                  <div className="card" style={{ padding: 'var(--space-md)', background: '#F8FAF9' }}>
                    <span className="body-xs text-muted">{t('requiredTrips')}</span>
                    <div className="heading-md text-forest mt-xs">{logisticsCalculation.transport?.trips} trips</div>
                    <span className="body-xs text-muted">Ceiling({calcQuantity}t ÷ {logisticsCalculation.transport?.vehicleConfig?.payloadCapacity}t)</span>
                  </div>

                  <div className="card" style={{ padding: 'var(--space-md)', background: '#F8FAF9' }}>
                    <span className="body-xs text-muted">{t('costPerTrip')}</span>
                    <div className="heading-md text-forest mt-xs">₹{logisticsCalculation.transport?.costPerTrip?.toLocaleString('en-IN')}</div>
                    <span className="body-xs text-muted">{t('freightTollsHandling')}</span>
                  </div>

                  <div className="card" style={{ padding: 'var(--space-md)', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <span className="body-xs text-forest font-semibold">{t('deliveredCostPerTonne')}</span>
                    <div className="heading-lg text-forest font-bold mt-xs">
                      ₹{logisticsCalculation.delivered?.deliveredCostPerTonne?.toLocaleString('en-IN')} / t
                    </div>
                    <span className="body-xs text-forest">{t('totalCostLabel')}: ₹{logisticsCalculation.delivered?.totalDeliveredCost?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Full Breakdown Table */}
                <h4 className="heading-sm mb-xs">{t('itemizedCostBreakdown')}</h4>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('colCostComponent')}</th>
                        <th>{t('colPerTrip')}</th>
                        <th>All Trips ({logisticsCalculation.transport?.trips})</th>
                        <th>{t('colCostPerTonne')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{t('distanceChargeRow', { distance: logisticsCalculation.roadDistanceKm, rate: logisticsCalculation.transport?.vehicleConfig?.ratePerKm })}</td>
                        <td>₹{logisticsCalculation.transport?.breakdown?.distanceChargePerTrip?.toLocaleString('en-IN')}</td>
                        <td>₹{logisticsCalculation.transport?.breakdown?.totalDistanceCharge?.toLocaleString('en-IN')}</td>
                        <td>₹{(logisticsCalculation.transport?.breakdown?.totalDistanceCharge / calcQuantity).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>{t('fixedTripBaseCharge')}</td>
                        <td>₹{logisticsCalculation.transport?.breakdown?.fixedTripCharge?.toLocaleString('en-IN')}</td>
                        <td>₹{logisticsCalculation.transport?.breakdown?.totalFixedCharges?.toLocaleString('en-IN')}</td>
                        <td>₹{(logisticsCalculation.transport?.breakdown?.totalFixedCharges / calcQuantity).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>{t('highwayTollExpenses')}</td>
                        <td>₹{logisticsCalculation.transport?.breakdown?.tollChargesPerTrip?.toLocaleString('en-IN')}</td>
                        <td>₹{logisticsCalculation.transport?.breakdown?.totalTolls?.toLocaleString('en-IN')}</td>
                        <td>₹{(logisticsCalculation.transport?.breakdown?.totalTolls / calcQuantity).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>{t('loadingUnloadingHandling')}</td>
                        <td>₹{logisticsCalculation.transport?.breakdown?.handlingPerTrip?.toLocaleString('en-IN')}</td>
                        <td>₹{logisticsCalculation.transport?.breakdown?.totalHandling?.toLocaleString('en-IN')}</td>
                        <td>₹{(logisticsCalculation.transport?.breakdown?.totalHandling / calcQuantity).toFixed(2)}</td>
                      </tr>
                      {logisticsCalculation.isInterstate && (
                        <tr>
                          <td>{t('interstatePermitSurcharge')}</td>
                          <td>₹{logisticsCalculation.transport?.breakdown?.interstateFeePerTrip?.toLocaleString('en-IN')}</td>
                          <td>₹{logisticsCalculation.transport?.breakdown?.totalInterstateFees?.toLocaleString('en-IN')}</td>
                          <td>₹{(logisticsCalculation.transport?.breakdown?.totalInterstateFees / calcQuantity).toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="font-semibold bg-gray-50">
                        <td>{t('totalTransportExpense')}</td>
                        <td>₹{logisticsCalculation.transport?.costPerTrip?.toLocaleString('en-IN')}</td>
                        <td className="text-forest font-bold">₹{logisticsCalculation.transport?.totalTransportationCost?.toLocaleString('en-IN')}</td>
                        <td className="text-forest font-bold">₹{logisticsCalculation.transport?.costPerTonne?.toLocaleString('en-IN')} / t</td>
                      </tr>
                      <tr>
                        <td>{t('rawPurchasePriceFarmGate')}</td>
                        <td>—</td>
                        <td>₹{logisticsCalculation.delivered?.totalPurchaseCost?.toLocaleString('en-IN')}</td>
                        <td>₹{Number(calcPurchasePrice).toLocaleString('en-IN')} / t</td>
                      </tr>
                      <tr className="font-bold text-forest" style={{ backgroundColor: '#F0FDF4' }}>
                        <td>{t('finalDeliveredCost')}</td>
                        <td>—</td>
                        <td className="heading-md">₹{logisticsCalculation.delivered?.totalDeliveredCost?.toLocaleString('en-IN')}</td>
                        <td className="heading-md">₹{logisticsCalculation.delivered?.deliveredCostPerTonne?.toLocaleString('en-IN')} / t</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-md body-xs text-muted" style={{ fontStyle: 'italic' }}>
                  {t('transportDisclaimerNotice')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PART 6: COMMERCIAL MATCHING RESULTS ── */}
        <section className="card section-card" id="commercial-matches">
          <div className="section-header-row mb-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="badge badge-green">{t('partSixBadge')}</span>
                <h2 className="heading-lg">Commercial Matching Opportunities ({commercialMatches.length})</h2>
              </div>
              <p className="body-sm text-muted mt-xs">
                Matches prioritized by proximity: <strong>1. Same District</strong>, <strong>2. Same State</strong>, <strong>3. Interstate</strong>.
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('colProducerFarmer')}</th>
                  <th>{t('colBuyerEnterprise')}</th>
                  <th>{t('colResidueType')}</th>
                  <th>{t('colAvailableQty')}</th>
                  <th>{t('colOriginDistrictState')}</th>
                  <th>{t('colDestLocation')}</th>
                  <th>{t('colRoadDist')}</th>
                  <th>{t('colAskingRate')}</th>
                  <th>{t('colOfferedRate')}</th>
                  <th>{t('colPurchasingPurpose')}</th>
                  <th>{t('colEstFreight')}</th>
                  <th>{t('colDeliveredCost')}</th>
                  <th>{t('colTotalCost')}</th>
                  <th>{t('colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {commercialMatches.map((m) => (
                  <tr key={m.id} className={m.priorityTier === 1 ? 'row-local-match' : ''}>
                    <td className="font-semibold">{m.farmerName}</td>
                    <td className="font-medium text-forest">{m.buyerOrgName}</td>
                    <td>{tResidue(m.residueType)}</td>
                    <td>{m.availableQuantity}t</td>
                    <td>
                      {m.sourceDistrict}, {m.sourceState}
                    </td>
                    <td>
                      {m.destDistrict}, {m.destState}
                    </td>
                    <td>
                      <span className="badge badge-muted">{m.roadDistance} km</span>
                    </td>
                    <td>₹{m.farmerAskingPrice.toLocaleString('en-IN')}/t</td>
                    <td className="text-forest font-semibold">₹{m.buyerOfferedRate.toLocaleString('en-IN')}/t</td>
                    <td>
                      <span className="badge badge-warm">{tPurpose(m.buyerPurchasingPurpose)}</span>
                    </td>
                    <td>₹{m.transportCostPerTonne.toLocaleString('en-IN')}/t</td>
                    <td className="font-bold text-forest">₹{m.deliveredPricePerTonne.toLocaleString('en-IN')}/t</td>
                    <td className="font-semibold">₹{m.totalEstimatedCost.toLocaleString('en-IN')}</td>
                    <td>
                      <Link
                        to={`/match-details/${m.buyerId}?listing=${m.listingId}`}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        Enquire
                      </Link>
                    </td>
                  </tr>
                ))}
                {commercialMatches.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center py-lg text-muted">
                      {t('noCommercialMatchesFilter')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

