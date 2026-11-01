// scripts/fixMarketRemainingTags.mjs
import fs from 'fs';
import path from 'path';

const file = path.resolve('src/pages/MarketIntelligence.jsx');
const backupFile = path.resolve('backup project/CropCycle-Connect/src/pages/MarketIntelligence.jsx');

let code = fs.readFileSync(file, 'utf8');

const replacements = [
  ['<span className="badge badge-green">Part 1</span>', '<span className="badge badge-green">{t(\'partOneBadge\')}</span>'],
  ['<h2 className="heading-lg">State-Wise Agricultural Crop Residue Production</h2>', '<h2 className="heading-lg">{t(\'stateWiseAgriProduction\')}</h2>'],
  ['<div className="badge badge-warm mb-xs">Official Sourced Status</div>', '<div className="badge badge-warm mb-xs">{t(\'officialSourcedStatus\')}</div>'],
  ['<th>Major Crop Produced</th>', '<th>{t(\'colMajorCropProduced\')}</th>'],
  ['<th>Residue Type</th>', '<th>{t(\'colResidueType\')}</th>'],
  ['<th>Crop Production (t/yr)</th>', '<th>{t(\'colCropProductionTonneYear\')}</th>'],
  ['<th>Residue Generated (t/yr)</th>', '<th>{t(\'colResidueGeneratedTonneYear\')}</th>'],
  ['<th>Estimated Usable Surplus (t/yr)</th>', '<th>{t(\'colEstimatedUsableSurplusTonneYear\')}</th>'],
  ['<th>Technically Collectable (t/yr)</th>', '<th>{t(\'colTechnicallyCollectableTonneYear\')}</th>'],
  ['<th>Existing Uses (t/yr)</th>', '<th>{t(\'colExistingUsesTonneYear\')}</th>'],
  ['<th>Remaining Available (t/yr)</th>', '<th>{t(\'colRemainingAvailableTonneYear\')}</th>'],
  ['<th>Classification</th>', '<th>{t(\'colClassification\')}</th>'],
  ['<span className="badge badge-green">Part 2</span>', '<span className="badge badge-green">{t(\'partTwoBadge\')}</span>'],
  ['<h2 className="heading-lg">State-Wise Supply &amp; Demand Ledger</h2>', '<h2 className="heading-lg">{t(\'stateWiseSupplyDemandLedger\')}</h2>'],
  ['<span className="badge badge-muted">Macro Agricultural Estimates (DES / MNRE)</span>', '<span className="badge badge-muted">{t(\'macroAgriEstimates\')}</span>'],
  ['<span className="badge badge-green">Live Platform Inventory</span>', '<span className="badge badge-green">{t(\'livePlatformInventory\')}</span>'],
  ['<h3 className="heading-md mt-xs">CropCycle Connect Verified Pool</h3>', '<h3 className="heading-md mt-xs">{t(\'cropCycleVerifiedPool\')}</h3>'],
  ['<span className="badge badge-green">Part 3</span>', '<span className="badge badge-green">{t(\'partThreeBadge\')}</span>'],
  ['<h2 className="heading-lg">Residue Visual Analytics &amp; Breakdown</h2>', '<h2 className="heading-lg">{t(\'residueVisualAnalyticsBreakdown\')}</h2>'],
  ['<h4 className="heading-sm mb-xs">Residue Production by Crop Species (t/yr)</h4>', '<h4 className="heading-sm mb-xs">{t(\'chartResidueProductionByCrop\')}</h4>'],
  ['<span className="body-xs text-muted mb-md block">Annual estimated generation across major crops</span>', '<span className="body-xs text-muted mb-md block">{t(\'chartAnnualEstimatedGen\')}</span>'],
  ['<h4 className="heading-sm mb-xs">Residue Utilization Breakdown</h4>', '<h4 className="heading-sm mb-xs">{t(\'chartResidueUtilizationBreakdown\')}</h4>'],
  ['<span className="body-xs text-muted mb-md block">Fodder &amp; Domestic vs Surplus vs Collectable</span>', '<span className="body-xs text-muted mb-md block">{t(\'chartFodderDomesticVsSurplus\')}</span>'],
  ['<p className="body-sm text-muted text-center py-md">Data not available for utilization breakdown.</p>', '<p className="body-sm text-muted text-center py-md">{t(\'dataNotAvailable\')}</p>'],
  ['<h4 className="heading-sm mb-xs">Platform Supply vs Demand (CropCycle Connect)</h4>', '<h4 className="heading-sm mb-xs">{t(\'chartPlatformSupplyVsDemand\')}</h4>'],
  ['<span className="body-xs text-muted mb-md block">Active inventory listed by registered users</span>', '<span className="body-xs text-muted mb-md block">{t(\'chartActiveInventoryListed\')}</span>'],
  ['<h4 className="heading-sm mb-xs">Allocation: Matched vs Unmatched Quantity</h4>', '<h4 className="heading-sm mb-xs">{t(\'chartAllocationMatchedVsUnmatched\')}</h4>'],
  ['<span className="body-xs text-muted mb-md block">Lot allocation status in active marketplace</span>', '<span className="body-xs text-muted mb-md block">{t(\'chartLotAllocationStatus\')}</span>'],
  ['<span className="badge badge-green">Part 4</span>', '<span className="badge badge-green">{t(\'partFourBadge\')}</span>'],
  ['<h2 className="heading-lg">Crop Residue Buying &amp; Selling Rates</h2>', '<h2 className="heading-lg">{t(\'cropResidueBuyingSellingRates\')}</h2>'],
  ['<span className="badge badge-green">Part 5</span>', '<span className="badge badge-green">{t(\'partFiveBadge\')}</span>'],
  ['<h2 className="heading-lg">Smart Interstate Transportation Cost Calculator</h2>', '<h2 className="heading-lg">{t(\'smartTransportationCalculator\')}</h2>'],
  ['<span className="badge badge-warm">OSRM Road Distance Grounded</span>', '<span className="badge badge-warm">{t(\'osrmRoadDistanceGrounded\')}</span>'],
  ['<th>Cost Component</th>', '<th>{t(\'colCostComponent\')}</th>'],
  ['<th>Per Trip</th>', '<th>{t(\'colPerTrip\')}</th>'],
  ['<th>Cost Per Tonne</th>', '<th>{t(\'colCostPerTonne\')}</th>'],
  ['<span className="badge badge-green">Part 6</span>', '<span className="badge badge-green">{t(\'partSixBadge\')}</span>'],
  ['<th>Producer (Farmer)</th>', '<th>{t(\'colProducerFarmer\')}</th>'],
  ['<th>Buyer / Enterprise</th>', '<th>{t(\'colBuyerEnterprise\')}</th>'],
  ['<th>Available Qty</th>', '<th>{t(\'colAvailableQty\')}</th>'],
  ['<th>Origin District &amp; State</th>', '<th>{t(\'colOriginDistrictState\')}</th>'],
  ['<th>Destination Location</th>', '<th>{t(\'colDestLocation\')}</th>'],
  ['<th>Road Dist.</th>', '<th>{t(\'colRoadDist\')}</th>'],
  ['<th>Asking Rate</th>', '<th>{t(\'colAskingRate\')}</th>'],
  ['<th>Offered Rate</th>', '<th>{t(\'colOfferedRate\')}</th>'],
  ['<th>Purchasing Purpose</th>', '<th>{t(\'colPurchasingPurpose\')}</th>'],
  ['<th>Est. Freight</th>', '<th>{t(\'colEstFreight\')}</th>'],
  ['<th>Delivered Cost</th>', '<th>{t(\'colDeliveredCost\')}</th>'],
  ['<th>Total Cost</th>', '<th>{t(\'colTotalCost\')}</th>'],
  ['<th>Action</th>', '<th>{t(\'colAction\')}</th>'],
];

replacements.forEach(([from, to]) => {
  if (code.includes(from)) {
    code = code.replace(from, to);
  } else {
    console.warn('Could not find match for:', from);
  }
});

fs.writeFileSync(file, code, 'utf8');
fs.writeFileSync(backupFile, code, 'utf8');
console.log('Fixed all remaining tags in MarketIntelligence.jsx and synced!');
