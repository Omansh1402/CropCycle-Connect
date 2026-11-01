// scripts/applyPageTranslations.mjs
import fs from 'fs';
import path from 'path';

// ── 1. UPDATE src/pages/MarketIntelligence.jsx ──
const marketFile = path.resolve('src/pages/MarketIntelligence.jsx');
const backupMarketFile = path.resolve('backup project/CropCycle-Connect/src/pages/MarketIntelligence.jsx');

let marketCode = fs.readFileSync(marketFile, 'utf8');

// Update useTranslation destructuring
marketCode = marketCode.replace(
  'const { t } = useTranslation();',
  'const { t, tCrop, tResidue, tPurpose, tVehicle, tStatus } = useTranslation();'
);

// Header replacements
marketCode = marketCode.replace(
  '<span className="section-eyebrow">National Agro-Biomass Intelligence</span>',
  '<span className="section-eyebrow">{t(\'nationalAgroBiomassIntelligence\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="badge badge-green">Traceable Ground Truth</span>',
  '<span className="badge badge-green">{t(\'traceableGroundTruth\')}</span>'
);

// Filter bar replacements
marketCode = marketCode.replace(
  '{t(\'selectState\')} (28 States &amp; 8 UTs)',
  '{t(\'selectState\')} ({t(\'twentyEightStatesEightUts\')})'
);
marketCode = marketCode.replace(
  '<option value="All">All Districts ({availableDistricts.length})</option>',
  '<option value="All">{t(\'allDistrictsOption\')} ({availableDistricts.length})</option>'
);
marketCode = marketCode.replace(
  '<option value="All">All Crop Residue Types</option>',
  '<option value="All">{t(\'allResidueTypes\')}</option>'
);
marketCode = marketCode.replace(
  '{RESIDUE_TYPES.map((t) => (\n                  <option key={t} value={t}>{t}</option>\n                ))}',
  '{RESIDUE_TYPES.map((item) => (\n                  <option key={item} value={item}>{tResidue(item)}</option>\n                ))}'
);
marketCode = marketCode.replace(
  '<option value="All">All Industrial Purposes</option>',
  '<option value="All">{t(\'allIndustrialPurposes\')}</option>'
);
marketCode = marketCode.replace(
  '{BUYER_PURPOSES.map((p) => (\n                  <option key={p} value={p}>{p}</option>\n                ))}',
  '{BUYER_PURPOSES.map((p) => (\n                  <option key={p} value={p}>{tPurpose(p)}</option>\n                ))}'
);

// Part 1 replacements
marketCode = marketCode.replace(
  '<span className="badge badge-green">Part 1</span>\n                <h2 className="heading-lg">State-Wise Agricultural Crop Residue Production</h2>',
  '<span className="badge badge-green">{t(\'partOneBadge\')}</span>\n                <h2 className="heading-lg">{t(\'stateWiseAgriProduction\')}</h2>'
);
marketCode = marketCode.replace(
  'Reporting Region: <strong>{selectedState}</strong> · Reporting Cycle: <strong>{stateAgriculturalData?.reportingYear || \'2023-24\'}</strong> · Units: <strong>tonnes/year</strong>',
  '{t(\'reportingRegion\')}: <strong>{selectedState}</strong> · {t(\'reportingCycle\')}: <strong>{stateAgriculturalData?.reportingYear || \'2023-24\'}</strong> · {t(\'unitsTonnesYear\')}'
);
marketCode = marketCode.replace(
  '<span className="body-xs text-muted block">Grounded Sourced Dataset:</span>',
  '<span className="body-xs text-muted block">{t(\'groundedSourcedDataset\')}:</span>'
);

// Part 1 table columns
marketCode = marketCode.replace(
  `                    <th>Major Crop Produced</th>
                    <th>Residue Type</th>
                    <th>Crop Production (t/yr)</th>
                    <th>Residue Generated (t/yr)</th>
                    <th>Estimated Usable Surplus (t/yr)</th>
                    <th>Technically Collectable (t/yr)</th>
                    <th>Existing Uses (t/yr)</th>
                    <th>Remaining Available (t/yr)</th>
                    <th>Classification</th>`,
  `                    <th>{t('colMajorCropProduced')}</th>
                    <th>{t('colResidueType')}</th>
                    <th>{t('colCropProductionTonneYear')}</th>
                    <th>{t('colResidueGeneratedTonneYear')}</th>
                    <th>{t('colEstimatedUsableSurplusTonneYear')}</th>
                    <th>{t('colTechnicallyCollectableTonneYear')}</th>
                    <th>{t('colExistingUsesTonneYear')}</th>
                    <th>{t('colRemainingAvailableTonneYear')}</th>
                    <th>{t('colClassification')}</th>`
);

// Part 1 table cell mappings
marketCode = marketCode.replace(
  '<td className="font-semibold">{c.cropName}</td>\n                        <td className="text-forest font-medium">{c.residueType}</td>',
  '<td className="font-semibold">{tCrop(c.cropName)}</td>\n                        <td className="text-forest font-medium">{tResidue(c.residueType)}</td>'
);
marketCode = marketCode.replace(
  '{c.classification || \'Scientifically Estimated\'}',
  '{c.classification ? t(c.classification) : t(\'scientificallyEstimated\')}'
);
marketCode = marketCode.replace(
  'No crop residue production records found for this state.',
  '{t(\'noCropRecordsFound\')}'
);
marketCode = marketCode.replace(
  '<div className="table-footnote mt-sm body-xs text-muted">\n                * Note: Crop production is officially reported by DES MoA&amp;FW. Gross residue and usable surplus are scientifically estimated using ICAR-IARI RPR and surplus coefficients.\n              </div>',
  '<div className="table-footnote mt-sm body-xs text-muted">\n                {t(\'partOneTableFootnote\')}\n              </div>'
);

// Part 2 replacements
marketCode = marketCode.replace(
  '<span className="badge badge-green">Part 2</span>\n                <h2 className="heading-lg">State-Wise Supply &amp; Demand Ledger</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                Clear distinction between annual statewide agricultural estimates and active live platform inventory on CropCycle Connect.\n              </p>',
  '<span className="badge badge-green">{t(\'partTwoBadge\')}</span>\n                <h2 className="heading-lg">{t(\'stateWiseSupplyDemandLedger\')}</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                {t(\'supplyDemandLedgerSubtitle\')}\n              </p>'
);
marketCode = marketCode.replace(
  '<span className="badge badge-muted">Macro Agricultural Estimates (DES / MNRE)</span>\n                <h3 className="heading-md mt-xs">{selectedState} Annual Residue Baseline</h3>',
  '<span className="badge badge-muted">{t(\'macroAgriEstimates\')}</span>\n                <h3 className="heading-md mt-xs">{selectedState} {t(\'annualResidueBaseline\')}</h3>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label">A. Total Agricultural Production</span>',
  '<span className="ledger-label">{t(\'ledgerTotalAgriProduction\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label">B. Available Agricultural Surplus</span>',
  '<span className="ledger-label">{t(\'ledgerAvailableAgriSurplus\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label">Technically Collectable Potential</span>',
  '<span className="ledger-label">{t(\'ledgerTechCollectablePotential\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label">Existing Uses (Fodder &amp; Fuel)</span>',
  '<span className="ledger-label">{t(\'ledgerExistingUsesFodderFuel\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label font-semibold">Estimated External Market Demand</span>',
  '<span className="ledger-label font-semibold">{t(\'ledgerEstimatedExternalMarketDemand\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="badge badge-green">Live Platform Inventory</span>\n                <h3 className="heading-md mt-xs">CropCycle Connect Verified Pool</h3>',
  '<span className="badge badge-green">{t(\'livePlatformInventory\')}</span>\n                <h3 className="heading-md mt-xs">{t(\'cropCycleVerifiedPool\')}</h3>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label">C. Platform Supply (Active Farmer Listings)</span>',
  '<span className="ledger-label">{t(\'ledgerPlatformSupply\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label">D. Platform Demand (Active Buyer Requirements)</span>',
  '<span className="ledger-label">{t(\'ledgerPlatformDemand\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label">E. Matched Quantity (Allocated Supply)</span>',
  '<span className="ledger-label">{t(\'ledgerMatchedQuantity\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label">F. Unmet Demand (Unallocated Procurement)</span>',
  '<span className="ledger-label">{t(\'ledgerUnmetDemand\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="ledger-label font-semibold">G. Available Unmatched Supply (Ready to Match)</span>',
  '<span className="ledger-label font-semibold">{t(\'ledgerAvailableUnmatchedSupply\')}</span>'
);
marketCode = marketCode.replace(
  '* Live inventory deduplicates real and demonstration lots to prevent double counting.',
  '{t(\'ledgerDeduplicateFootnote\')}'
);

// Part 3 replacements
marketCode = marketCode.replace(
  '<span className="badge badge-green">Part 3</span>\n                <h2 className="heading-lg">Residue Visual Analytics &amp; Breakdown</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                Comparative distributions of production, surplus, platform utilization, and matched quantities.\n              </p>',
  '<span className="badge badge-green">{t(\'partThreeBadge\')}</span>\n                <h2 className="heading-lg">{t(\'residueVisualAnalyticsBreakdown\')}</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                {t(\'residueVisualAnalyticsSubtitle\')}\n              </p>'
);
marketCode = marketCode.replace(
  '<h4 className="heading-sm mb-xs">Residue Production by Crop Species (t/yr)</h4>\n              <span className="body-xs text-muted mb-md block">Annual estimated generation across major crops</span>',
  '<h4 className="heading-sm mb-xs">{t(\'chartResidueProductionByCrop\')}</h4>\n              <span className="body-xs text-muted mb-md block">{t(\'chartAnnualEstimatedGen\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="font-medium body-xs">{c.residueType}</span>',
  '<span className="font-medium body-xs">{tResidue(c.residueType)}</span>'
);
marketCode = marketCode.replace(
  '<p className="body-sm text-muted text-center py-md">No agricultural crops reported.</p>',
  '<p className="body-sm text-muted text-center py-md">{t(\'noAgriCropsReported\')}</p>'
);
marketCode = marketCode.replace(
  '<h4 className="heading-sm mb-xs">Residue Utilization Breakdown</h4>\n              <span className="body-xs text-muted mb-md block">Fodder &amp; Domestic vs Surplus vs Collectable</span>',
  '<h4 className="heading-sm mb-xs">{t(\'chartResidueUtilizationBreakdown\')}</h4>\n              <span className="body-xs text-muted mb-md block">{t(\'chartFodderDomesticVsSurplus\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="body-xs">Existing Uses: ',
  '<span className="body-xs">{t(\'existingUsesLabel\')}: '
);
marketCode = marketCode.replace(
  '<span className="body-xs">Available Surplus: ',
  '<span className="body-xs">{t(\'availableSurplusLabel\')}: '
);
marketCode = marketCode.replace(
  '<span className="body-xs text-muted">Technically Collectable Fraction:</span>',
  '<span className="body-xs text-muted">{t(\'technicallyCollectableFraction\')}</span>'
);
marketCode = marketCode.replace(
  '(~75–85% of gross residue)',
  '{t(\'seventyFiveToEightyFiveGrossResidue\')}'
);
marketCode = marketCode.replace(
  '<h4 className="heading-sm mb-xs">Platform Supply vs Demand (CropCycle Connect)</h4>\n              <span className="body-xs text-muted mb-md block">Active inventory listed by registered users</span>',
  '<h4 className="heading-sm mb-xs">{t(\'chartPlatformSupplyVsDemand\')}</h4>\n              <span className="body-xs text-muted mb-md block">{t(\'chartActiveInventoryListed\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="font-medium body-xs">Platform Supply (Farmers)</span>',
  '<span className="font-medium body-xs">{t(\'chartPlatformSupplyFarmers\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="font-medium body-xs">Platform Demand (Buyers)</span>',
  '<span className="font-medium body-xs">{t(\'chartPlatformDemandBuyers\')}</span>'
);
marketCode = marketCode.replace(
  '<h4 className="heading-sm mb-xs">Allocation: Matched vs Unmatched Quantity</h4>\n              <span className="body-xs text-muted mb-md block">Lot allocation status in active marketplace</span>',
  '<h4 className="heading-sm mb-xs">{t(\'chartAllocationMatchedVsUnmatched\')}</h4>\n              <span className="body-xs text-muted mb-md block">{t(\'chartLotAllocationStatus\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="font-medium body-xs">Matched Quantity</span>',
  '<span className="font-medium body-xs">{t(\'chartMatchedQuantity\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="font-medium body-xs">Available Unmatched Supply</span>',
  '<span className="font-medium body-xs">{t(\'chartAvailableUnmatchedSupply\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="font-medium body-xs">Unmet Buyer Demand</span>',
  '<span className="font-medium body-xs">{t(\'chartUnmetBuyerDemand\')}</span>'
);

// Part 4 replacements
marketCode = marketCode.replace(
  '<span className="badge badge-green">Part 4</span>\n                <h2 className="heading-lg">Crop Residue Buying &amp; Selling Rates</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                Real asking prices, buyer quotes, and verified official benchmark tariffs. All rates in <strong>INR / tonne (₹/tonne)</strong>.\n              </p>',
  '<span className="badge badge-green">{t(\'partFourBadge\')}</span>\n                <h2 className="heading-lg">{t(\'cropResidueBuyingSellingRates\')}</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                {t(\'cropResidueRatesSubtitle\')}\n              </p>'
);
marketCode = marketCode.replace(
  '<h4 className="heading-sm font-semibold">{type}</h4>\n                  <span className="badge badge-muted body-xs">{p.listingCount} lots</span>',
  '<h4 className="heading-sm font-semibold">{tResidue(type)}</h4>\n                  <span className="badge badge-muted body-xs">{p.listingCount} {t(\'lotsLabel\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="text-muted">Farmer Asking:</span>',
  '<span className="text-muted">{t(\'farmerAskingRate\')}</span>'
);
marketCode = marketCode.replace(
  ": 'Direct Negotiation'}",
  ": t('directNegotiation')}"
);
marketCode = marketCode.replace(
  '<span className="text-muted">Buyer Offered:</span>',
  '<span className="text-muted">{t(\'buyerOfferedRate\')}</span>'
);
marketCode = marketCode.replace(
  ": 'Open Quote'}",
  ": t('openQuote')}"
);
marketCode = marketCode.replace(
  '<span className="text-muted">Verified Reference:</span>',
  '<span className="text-muted">{t(\'verifiedReferenceRate\')}</span>'
);
marketCode = marketCode.replace(
  ": 'No verified rate'}",
  ": t('noVerifiedRate')}"
);
marketCode = marketCode.replace(
  '<span>Condition: {p.referenceRate.deliveryCondition}</span>',
  '<span>{t(\'deliveryCondition\')} {p.referenceRate.deliveryCondition}</span>'
);
marketCode = marketCode.replace(
  '<span className="block mt-xxs">Source: {p.referenceRate.source} ({p.referenceRate.reportingYear})</span>',
  '<span className="block mt-xxs">{t(\'sourceLabel\')} {p.referenceRate.source} ({p.referenceRate.reportingYear})</span>'
);
marketCode = marketCode.replace(
  'No verified price available. Contact the buyer or negotiate directly.',
  '{t(\'noVerifiedPriceNegotiate\')}'
);

// Part 5 replacements
marketCode = marketCode.replace(
  '<span className="badge badge-green">Part 5</span>\n                <h2 className="heading-lg">Smart Interstate Transportation Cost Calculator</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                Compute route distance, multi-trip payload logistics, and delivered procurement costs between any two districts or states.\n              </p>\n            </div>\n            <span className="badge badge-warm">OSRM Road Distance Grounded</span>',
  '<span className="badge badge-green">{t(\'partFiveBadge\')}</span>\n                <h2 className="heading-lg">{t(\'smartTransportationCalculator\')}</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                {t(\'smartTransportationCalculatorSubtitle\')}\n              </p>\n            </div>\n            <span className="badge badge-warm">{t(\'osrmRoadDistanceGrounded\')}</span>'
);
marketCode = marketCode.replace(
  '<h3 className="heading-sm mb-md">Route &amp; Freight Parameters</h3>',
  '<h3 className="heading-sm mb-md">{t(\'routeFreightParameters\')}</h3>'
);
marketCode = marketCode.replace(
  '<label className="form-label font-semibold">Origin State (Farmer Location)</label>',
  '<label className="form-label font-semibold">{t(\'originStateFarmerLocation\')}</label>'
);
marketCode = marketCode.replace(
  '<label className="form-label font-semibold">Origin District / Town</label>',
  '<label className="form-label font-semibold">{t(\'originDistrictTown\')}</label>'
);
marketCode = marketCode.replace(
  '<label className="form-label font-semibold">Destination State (Buyer Location)</label>',
  '<label className="form-label font-semibold">{t(\'destinationStateBuyerLocation\')}</label>'
);
marketCode = marketCode.replace(
  '<label className="form-label font-semibold">Destination District / Plant</label>',
  '<label className="form-label font-semibold">{t(\'destinationDistrictPlant\')}</label>'
);
marketCode = marketCode.replace(
  '<label className="form-label font-semibold">Residue Type</label>',
  '<label className="form-label font-semibold">{t(\'residueType\')}</label>'
);
marketCode = marketCode.replace(
  '{RESIDUE_TYPES.map((t) => (\n                      <option key={t} value={t}>{t}</option>\n                    ))}',
  '{RESIDUE_TYPES.map((item) => (\n                      <option key={item} value={item}>{tResidue(item)}</option>\n                    ))}'
);
marketCode = marketCode.replace(
  '<label className="form-label font-semibold">Lot Size (Tonnes)</label>',
  '<label className="form-label font-semibold">{t(\'lotSizeTonnes\')}</label>'
);
marketCode = marketCode.replace(
  '<label className="form-label font-semibold">Commercial Vehicle Profile</label>',
  '<label className="form-label font-semibold">{t(\'commercialVehicleProfile\')}</label>'
);
marketCode = marketCode.replace(
  '{Object.values(VEHICLE_CONFIGS).map((v) => (\n                    <option key={v.id} value={v.id}>\n                      {v.label} ({v.payloadTonnes}T payload · ₹{v.ratePerKm}/km)\n                    </option>\n                  ))}',
  '{Object.values(VEHICLE_CONFIGS).map((v) => (\n                    <option key={v.id} value={v.id}>\n                      {tVehicle(v.id) || tVehicle(v.label) || v.label} ({v.payloadTonnes}T payload · ₹{v.ratePerKm}/km)\n                    </option>\n                  ))}'
);
marketCode = marketCode.replace(
  '<label className="form-label">Purchase Price (₹/t)</label>',
  '<label className="form-label">{t(\'purchasePricePerTonneLabel\')}</label>'
);
marketCode = marketCode.replace(
  '<label className="form-label">Other Charges (₹/t)</label>',
  '<label className="form-label">{t(\'otherChargesPerTonneLabel\')}</label>'
);
marketCode = marketCode.replace(
  '<span className="body-sm">Include Empty Return Surcharge (50%)</span>',
  '<span className="body-sm">{t(\'includeEmptyReturnSurcharge\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="badge badge-green">Scenario Evaluation</span>',
  '<span className="badge badge-green">{t(\'scenarioEvaluationBadge\')}</span>'
);
marketCode = marketCode.replace(
  '{logisticsCalculation.isInterstate ? \'Interstate Freight\' : \'Intra-State Haulage\'}',
  '{logisticsCalculation.isInterstate ? t(\'interstateFreightBadge\') : t(\'intraStateHaulageBadge\')}'
);
marketCode = marketCode.replace(
  '<span className="body-xs text-muted">Road Transit Distance</span>',
  '<span className="body-xs text-muted">{t(\'roadTransitDistance\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="body-xs text-muted">OSRM Route</span>',
  '<span className="body-xs text-muted">{t(\'osrmRoute\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="body-xs text-muted">Required Trips</span>',
  '<span className="body-xs text-muted">{t(\'requiredTrips\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="body-xs text-muted">Cost Per Trip</span>',
  '<span className="body-xs text-muted">{t(\'costPerTrip\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="body-xs text-muted">Freight + tolls + handling</span>',
  '<span className="body-xs text-muted">{t(\'freightTollsHandling\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="body-xs text-forest font-semibold">Delivered Cost / Tonne</span>',
  '<span className="body-xs text-forest font-semibold">{t(\'deliveredCostPerTonne\')}</span>'
);
marketCode = marketCode.replace(
  '<span className="body-xs text-forest">Total: ₹',
  '<span className="body-xs text-forest">{t(\'totalCostLabel\')}: ₹'
);
marketCode = marketCode.replace(
  '<h4 className="heading-sm mb-xs">Itemized Freight &amp; Delivered Cost Breakdown</h4>',
  '<h4 className="heading-sm mb-xs">{t(\'itemizedCostBreakdown\')}</h4>'
);

// Part 5 table columns
marketCode = marketCode.replace(
  `                      <tr>
                        <th>Cost Component</th>
                        <th>Per Trip</th>
                        <th>All Trips ({logisticsCalculation.transport?.trips})</th>
                        <th>Cost Per Tonne</th>
                      </tr>`,
  `                      <tr>
                        <th>{t('colCostComponent')}</th>
                        <th>{t('colPerTrip')}</th>
                        <th>{t('colAllTrips', { count: logisticsCalculation.transport?.trips || 1 })}</th>
                        <th>{t('colCostPerTonne')}</th>
                      </tr>`
);

// Part 5 rows
marketCode = marketCode.replace(
  'Distance Charge ({logisticsCalculation.roadDistanceKm} km @ ₹{logisticsCalculation.transport?.vehicleConfig?.ratePerKm}/km)',
  '{t(\'distanceChargeRow\', { distance: logisticsCalculation.roadDistanceKm, rate: logisticsCalculation.transport?.vehicleConfig?.ratePerKm })}'
);
marketCode = marketCode.replace(
  '<td>Fixed Trip Base Charge</td>',
  '<td>{t(\'fixedTripBaseCharge\')}</td>'
);
marketCode = marketCode.replace(
  '<td>Highway Toll Expenses (NHAI Standard)</td>',
  '<td>{t(\'highwayTollExpenses\')}</td>'
);
marketCode = marketCode.replace(
  '<td>Loading &amp; Unloading Handling</td>',
  '<td>{t(\'loadingUnloadingHandling\')}</td>'
);
marketCode = marketCode.replace(
  '<td>Interstate Commercial Permit Surcharge</td>',
  '<td>{t(\'interstatePermitSurcharge\')}</td>'
);
marketCode = marketCode.replace(
  '<td>Total Transportation Logistics Expense</td>',
  '<td>{t(\'totalTransportExpense\')}</td>'
);
marketCode = marketCode.replace(
  '<td>Biomass Raw Purchase Price (Farm-Gate)</td>',
  '<td>{t(\'rawPurchasePriceFarmGate\')}</td>'
);
marketCode = marketCode.replace(
  '<td>Final Delivered Cost (Purchase + Transport + Other)</td>',
  '<td>{t(\'finalDeliveredCost\')}</td>'
);
marketCode = marketCode.replace(
  '<strong>Important Notice:</strong> Indicative Transportation Estimate — Confirm Final Price With Transporter.',
  '{t(\'transportDisclaimerNotice\')}'
);

// Part 6 replacements
marketCode = marketCode.replace(
  '<span className="badge badge-green">Part 6</span>\n                <h2 className="heading-lg">Commercial Matching Opportunities ({commercialMatches.length})</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                Matches prioritized by proximity: <strong>1. Same District</strong>, <strong>2. Same State</strong>, <strong>3. Interstate</strong>.\n              </p>',
  '<span className="badge badge-green">{t(\'partSixBadge\')}</span>\n                <h2 className="heading-lg">{t(\'commercialMatchingOpportunities\', { count: commercialMatches.length })}</h2>\n              </div>\n              <p className="body-sm text-muted mt-xs">\n                {t(\'matchesProximityNotice\')}\n              </p>'
);

// Part 6 table columns
marketCode = marketCode.replace(
  `                <tr>
                  <th>Producer (Farmer)</th>
                  <th>Buyer / Enterprise</th>
                  <th>Residue Type</th>
                  <th>Available Qty</th>
                  <th>Origin District &amp; State</th>
                  <th>Destination Location</th>
                  <th>Road Dist.</th>
                  <th>Asking Rate</th>
                  <th>Offered Rate</th>
                  <th>Purchasing Purpose</th>
                  <th>Est. Freight</th>
                  <th>Delivered Cost</th>
                  <th>Total Cost</th>
                  <th>Action</th>
                </tr>`,
  `                <tr>
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
                </tr>`
);

// Part 6 row data
marketCode = marketCode.replace(
  '<td>{m.residueType}</td>',
  '<td>{tResidue(m.residueType)}</td>'
);
marketCode = marketCode.replace(
  '<span className="badge badge-warm">{m.buyerPurchasingPurpose}</span>',
  '<span className="badge badge-warm">{tPurpose(m.buyerPurchasingPurpose)}</span>'
);
marketCode = marketCode.replace(
  'style={{ padding: \'4px 10px\', fontSize: \'0.75rem\' }}\n                      >\n                        Enquire\n                      </Link>',
  'style={{ padding: \'4px 10px\', fontSize: \'0.75rem\' }}\n                      >\n                        {t(\'enquireBtn\')}\n                      </Link>'
);
marketCode = marketCode.replace(
  'No commercial matches match your current filter criteria.',
  '{t(\'noCommercialMatchesFilter\')}'
);

fs.writeFileSync(marketFile, marketCode, 'utf8');
fs.writeFileSync(backupMarketFile, marketCode, 'utf8');
console.log('Successfully updated MarketIntelligence.jsx and synced to backup!');


// ── 2. UPDATE src/pages/Profile.jsx ──
const profileFile = path.resolve('src/pages/Profile.jsx');
const backupProfileFile = path.resolve('backup project/CropCycle-Connect/src/pages/Profile.jsx');

let profileCode = fs.readFileSync(profileFile, 'utf8');

// Update validation messages
profileCode = profileCode.replace(
  "errs.fullName = 'Full name must be at least 2 characters long.';",
  "errs.fullName = t('errFullName');"
);
profileCode = profileCode.replace(
  "errs.email = 'Please provide a valid email address.';",
  "errs.email = t('errEmailValidation');"
);
profileCode = profileCode.replace(
  "errs.phone = 'Please provide a valid phone number (minimum 7 digits).';",
  "errs.phone = t('errPhoneValidation');"
);
profileCode = profileCode.replace(
  "errs.accountType = 'Please select a valid account type.';",
  "errs.accountType = t('errAccountType');"
);
profileCode = profileCode.replace(
  "errs.state = 'State is required.';",
  "errs.state = t('errState');"
);
profileCode = profileCode.replace(
  "errs.district = 'District is required.';",
  "errs.district = t('errDistrict');"
);
profileCode = profileCode.replace(
  "errs.location = 'Location or address is required.';",
  "errs.location = t('errLocationReq');"
);
profileCode = profileCode.replace(
  "setErrorMessage('Please correct the highlighted fields before saving.');",
  "setErrorMessage(t('profileValidationPrompt'));"
);
profileCode = profileCode.replace(
  "setSuccessMessage('Profile changes have been successfully saved to local browser storage.');",
  "setSuccessMessage(t('profileSavedSuccess'));"
);
profileCode = profileCode.replace(
  "setErrorMessage('Unable to save changes to browser storage. Please check storage permissions.');",
  "setErrorMessage(t('profileSaveError'));"
);

// Notice banner
profileCode = profileCode.replace(
  '<h2 className="profile-notice__title">Local Demo Profile</h2>\n            <p className="profile-notice__text">\n              This profile is stored locally in your browser storage for evaluation and demonstration. Cloud authentication and remote synchronization are not active. Changes saved here will persist across browser refreshes on this device.\n            </p>',
  '<h2 className="profile-notice__title">{t(\'localDemoProfile\')}</h2>\n            <p className="profile-notice__text">\n              {t(\'localDemoProfileNotice\')}\n            </p>'
);

// Account badge and Member date
profileCode = profileCode.replace(
  '{profile.accountType}',
  "{profile.accountType === 'Farmer' ? t('farmerProducerOption') : t('buyerConsumerOption')}"
);
profileCode = profileCode.replace(
  'Member since {memberDate}',
  '{t(\'memberSince\')} {memberDate}'
);

// Edit Profile button
profileCode = profileCode.replace(
  'style={{ marginRight: \'6px\' }}\n                  aria-hidden="true"\n                >\n                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />\n                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />\n                </svg>\n                Edit Profile',
  'style={{ marginRight: \'6px\' }}\n                  aria-hidden="true"\n                >\n                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />\n                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />\n                </svg>\n                {t(\'editProfile\')}'
);

// Edit title
profileCode = profileCode.replace(
  'Edit Profile Details',
  '{t(\'editProfileDetails\')}'
);

// Form labels and options
profileCode = profileCode.replace(
  'Full Name <span className="req">*</span>',
  '{t(\'fullName\')} <span className="req">*</span>'
);
profileCode = profileCode.replace(
  'Account Type <span className="req">*</span>',
  '{t(\'accountType\')} <span className="req">*</span>'
);
profileCode = profileCode.replace(
  '<option value="Farmer">Farmer (Residue Producer)</option>\n                    <option value="Buyer">Buyer (Biomass Consumer)</option>',
  '<option value="Farmer">{t(\'farmerProducerOption\')}</option>\n                    <option value="Buyer">{t(\'buyerConsumerOption\')}</option>'
);
profileCode = profileCode.replace(
  'Email Address <span className="req">*</span>',
  '{t(\'emailAddress\')} <span className="req">*</span>'
);
profileCode = profileCode.replace(
  'Phone Number <span className="req">*</span>',
  '{t(\'phoneNumber\')} <span className="req">*</span>'
);
profileCode = profileCode.replace(
  'State <span className="req">*</span>',
  '{t(\'stateLabel\')} <span className="req">*</span>'
);
profileCode = profileCode.replace(
  'District <span className="req">*</span>',
  '{t(\'districtLabel\')} <span className="req">*</span>'
);
profileCode = profileCode.replace(
  'Specific Location / Address <span className="req">*</span>',
  '{t(\'specificLocationAddress\')} <span className="req">*</span>'
);
profileCode = profileCode.replace(
  '<button\n                  type="button"\n                  className="btn btn-secondary"\n                  onClick={handleCancel}\n                >\n                  Cancel\n                </button>\n                <button\n                  type="submit"\n                  className="btn btn-primary"\n                >\n                  Save Changes\n                </button>',
  '<button\n                  type="button"\n                  className="btn btn-secondary"\n                  onClick={handleCancel}\n                >\n                  {t(\'cancel\')}\n                </button>\n                <button\n                  type="submit"\n                  className="btn btn-primary"\n                >\n                  {t(\'saveChanges\')}\n                </button>'
);

// View Card 1: Account Information
profileCode = profileCode.replace(
  'Account Information\n                </h2>',
  '{t(\'accountInformation\')}\n                </h2>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">Full Name</span>',
  '<span className="profile-field__label">{t(\'fullName\')}</span>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">Account Role</span>',
  '<span className="profile-field__label">{t(\'accountRole\')}</span>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">Email Address</span>',
  '<span className="profile-field__label">{t(\'emailAddress\')}</span>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">Phone Number</span>',
  '<span className="profile-field__label">{t(\'phoneNumber\')}</span>'
);

// View Card 2: Operating Location
profileCode = profileCode.replace(
  'Operating Location\n                </h2>',
  '{t(\'operatingLocation\')}\n                </h2>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">State</span>',
  '<span className="profile-field__label">{t(\'stateLabel\')}</span>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">District</span>',
  '<span className="profile-field__label">{t(\'districtLabel\')}</span>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">Specific Location / Address</span>',
  '<span className="profile-field__label">{t(\'specificLocationAddress\')}</span>'
);

// View Card 3: Storage & Authentication Status
profileCode = profileCode.replace(
  'Storage &amp; Authentication Status\n                </h2>',
  '{t(\'storageAuthStatus\')}\n                </h2>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">Data Persistence Mode</span>\n                    <span className="profile-field__value">Local Browser Storage (Client-side)</span>',
  '<span className="profile-field__label">{t(\'dataPersistenceMode\')}</span>\n                    <span className="profile-field__value">{t(\'clientSideStorage\')}</span>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">Account Created</span>',
  '<span className="profile-field__label">{t(\'accountCreated\')}</span>'
);
profileCode = profileCode.replace(
  '<span className="profile-field__label">Security Architecture Note</span>\n                    <span className="profile-field__value" style={{ color: \'var(--color-text-secondary)\', fontSize: \'0.8125rem\' }}>\n                      Profile state is maintained securely in your local browser sandbox without exposing backend API secrets or requesting unauthorized public Supabase writes.\n                    </span>',
  '<span className="profile-field__label">{t(\'securityArchNote\')}</span>\n                    <span className="profile-field__value" style={{ color: \'var(--color-text-secondary)\', fontSize: \'0.8125rem\' }}>\n                      {t(\'securityArchSandboxDesc\')}\n                    </span>'
);

fs.writeFileSync(profileFile, profileCode, 'utf8');
fs.writeFileSync(backupProfileFile, profileCode, 'utf8');
console.log('Successfully updated Profile.jsx and synced to backup!');
