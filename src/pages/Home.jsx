// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import SplitText from '../components/reactbits/SplitText';
import BlurText from '../components/reactbits/BlurText';
import RotatingText from '../components/reactbits/RotatingText';
import Waves from '../components/reactbits/Waves';
import LogoLoop from '../components/reactbits/LogoLoop';
import CountUp from '../components/reactbits/CountUp';
import FadeContent from '../components/reactbits/FadeContent';
import { useTranslation } from '../lib/i18n';
import './Home.css';

const BASE_SYSTEM_STAGES = [
  {
    step: '01',
    titleKey: 'systemStage1Title',
    descKey: 'systemStage1Desc',
    title: 'Cluster Supply Logging',
    desc: 'Farmers and FPOs record available lot volumes, residue species, field coordinates, and harvest windows.',
  },
  {
    step: '02',
    titleKey: 'systemStage2Title',
    descKey: 'systemStage2Desc',
    title: 'Multi-Factor Engine',
    desc: 'Our deterministic algorithm evaluates quantity fit (40%), distance (30%), intake capacity (20%), and use-case synergy (10%).',
  },
  {
    step: '03',
    titleKey: 'systemStage3Title',
    descKey: 'systemStage3Desc',
    title: 'Logistics Aggregation',
    desc: 'Smallholder volumes within a 15 km radius are grouped into full freight batches to minimize transport overhead.',
  },
  {
    step: '04',
    titleKey: 'systemStage4Title',
    descKey: 'systemStage4Desc',
    title: 'Circular Conversion',
    desc: 'Residue is routed to bio-CNG plants, paper mills, and animal feed units — eliminating open burning permanently.',
  },
];

const FEEDSTOCK_SPECIFICATIONS = [
  {
    crop: 'Paddy Straw',
    categoryKey: 'cerealResidue',
    calorific: '~3,200 kcal/kg',
    moisture: '< 15%',
    usesKey: 'usesPaddyStraw',
  },
  {
    crop: 'Wheat Straw',
    categoryKey: 'cerealResidue',
    calorific: '~3,400 kcal/kg',
    moisture: '< 12%',
    usesKey: 'usesWheatStraw',
  },
  {
    crop: 'Sugarcane Bagasse',
    categoryKey: 'stalkFiber',
    calorific: '~2,200 kcal/kg (wet)',
    moisture: '< 50%',
    usesKey: 'usesSugarcaneBagasse',
  },
  {
    crop: 'Cotton Stalks',
    categoryKey: 'stalkFiber',
    calorific: '~3,900 kcal/kg',
    moisture: '< 14%',
    usesKey: 'usesCottonStalks',
  },
  {
    crop: 'Maize Stover',
    categoryKey: 'cerealResidue',
    calorific: '~3,800 kcal/kg',
    moisture: '< 15%',
    usesKey: 'usesMaizeStover',
  },
  {
    crop: 'Groundnut Shells',
    categoryKey: 'huskShell',
    calorific: '~4,200 kcal/kg',
    moisture: '< 10%',
    usesKey: 'usesGroundnutShells',
  },
];

export default function Home() {
  const { t, tResidue } = useTranslation();

  const rotatingTexts = [
    t('heroRotating1') || 'Bio-CNG Refineries',
    t('heroRotating2') || 'Cellulosic Ethanol Plants',
    t('heroRotating3') || 'Paper & Pulp Mills',
    t('heroRotating4') || 'Biochar Producers',
    t('heroRotating5') || 'Thermal Co-Firing Boilers',
  ];

  const systemStages = BASE_SYSTEM_STAGES.map((s) => ({
    step: s.step,
    title: t(s.titleKey) || s.title,
    desc: t(s.descKey) || s.desc,
  }));

  const tickerFeedstocks = [
    { title: tResidue('Paddy Straw'), subtitle: '3,200 kcal/kg' },
    { title: t('heroRotating1') || 'Bio-CNG Refineries', subtitle: 'SATAT Protocol' },
    { title: tResidue('Wheat Straw'), subtitle: 'Cellulose & Fodder' },
    { title: t('heroRotating3') || 'Cellulosic Paper Mills', subtitle: 'Recycled Packaging' },
    { title: tResidue('Sugarcane Bagasse'), subtitle: 'Cogeneration Power' },
    { title: t('heroRotating4') || 'Biochar Facilities', subtitle: 'Carbon Sequestration' },
    { title: tResidue('Cotton Stalks'), subtitle: 'High-Density Pellets' },
    { title: tResidue('Maize Stover'), subtitle: 'Biofuel & Feed' },
    { title: t('heroRotating5') || 'Industrial Boilers', subtitle: 'Thermal Co-Firing' },
  ];

  return (
    <main className="home">
      {/* ── Editorial Hero with Subtle Waves Background & SplitText ── */}
      <section className="home-hero">
        <Waves
          lineColor="#81947C"
          accentColor="#315B43"
          opacity={0.22}
          amplitude={22}
          spacing={22}
          speed={0.4}
        />
        <div className="container hero-container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="section-eyebrow">
                <span>{t('heroEyebrow') || 'National Agricultural Biomass Exchange'}</span>
              </div>

              <SplitText
                text={t('heroHeadline') || 'Architecting the circular supply chain for crop residue.'}
                tag="h1"
                className="display-xl hero-headline"
                delay={0.03}
                duration={0.65}
              />

              <div className="body-lg hero-subtext">
                {t('heroSubtextPrefix') ||
                  'CropCycle Connect operates a verified marketplace and routing engine matching agricultural cooperatives with'}{' '}
                <RotatingText
                  texts={rotatingTexts}
                  highlight={true}
                  highlightColor="rgba(49, 91, 67, 0.12)"
                  style={{ color: '#193B2B', fontWeight: 700 }}
                  rotationInterval={2800}
                />{' '}
                {t('heroSubtextSuffix') ||
                  '— converting seasonal field burning into quantifiable economic and atmospheric value.'}
              </div>

              <FadeContent delay={0.2} distance={18}>
                <div className="hero-cta">
                  <Link to="/farmer" className="btn btn-primary btn-lg">
                    {t('listFarmResidue') || 'List Farm Residue'}
                  </Link>
                  <Link to="/buyer" className="btn btn-secondary btn-lg">
                    {t('registerDemandHero') || 'Register Demand'}
                  </Link>
                </div>

                <div className="hero-metadata">
                  <div className="hero-meta-item">
                    <span className="meta-dot" />
                    <span>{t('heroMetaGps') || 'Verified Farm Coordinates'}</span>
                  </div>
                  <div className="hero-meta-item">
                    <span className="meta-dot" />
                    <span>{t('heroMetaFreight') || 'Real-Time Road Haulage Calculation'}</span>
                  </div>
                  <div className="hero-meta-item">
                    <span className="meta-dot" />
                    <span>{t('heroMetaNoMarkup') || 'Zero Commercial Intermediary Markups'}</span>
                  </div>
                </div>
              </FadeContent>
            </div>

            {/* Architectural Flow Diagram */}
            <FadeContent delay={0.25} distance={20} className="hero-visual">
              <div className="architecture-diagram">
                <div className="diagram-header">
                  <span className="diagram-title">
                    {t('archPipelineTitle') || 'System Pipeline · Dual Sided Protocol'}
                  </span>
                  <span className="diagram-status">{t('archOnline') || 'Online'}</span>
                </div>

                <div className="diagram-body">
                  <div className="diagram-node">
                    <span className="node-num">01</span>
                    <div className="node-info">
                      <div className="node-label">{t('archNode1Title') || 'Farm Supply Point'}</div>
                      <div className="node-detail">
                        {t('archNode1Detail') || 'Farmer & FPO Lot Registration · GPS & Moisture'}
                      </div>
                    </div>
                  </div>

                  <div className="diagram-connector">
                    <div className="connector-line" />
                    <span className="connector-tag">
                      {t('archConnector1') || 'Aggregation & Batching'}
                    </span>
                  </div>

                  <div className="diagram-node diagram-node--engine">
                    <span className="node-num">02</span>
                    <div className="node-info">
                      <div className="node-label">
                        {t('archNode2Title') || '5-Dimension Matching Algorithm'}
                      </div>
                      <div className="node-detail">
                        {t('archNode2Detail') || '40% Quantity · 30% Proximity · 20% Capacity · 10% End-Use'}
                      </div>
                    </div>
                  </div>

                  <div className="diagram-connector">
                    <div className="connector-line" />
                    <span className="connector-tag">{t('archConnector2') || 'Road Routing API'}</span>
                  </div>

                  <div className="diagram-node">
                    <span className="node-num">03</span>
                    <div className="node-info">
                      <div className="node-label">
                        {t('archNode3Title') || 'Industrial Refinery Hub'}
                      </div>
                      <div className="node-detail">
                        {t('archNode3Detail') || 'Bio-CNG · Paper Mill · Packaging · Livestock Feed'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="diagram-footer">
                  <div className="diagram-stat">
                    <span className="diagram-stat-label">
                      {t('archPrecision') || 'Algorithmic Precision'}
                    </span>
                    <span className="diagram-stat-val">
                      {t('archPrecisionVal') || '100 pt Scale'}
                    </span>
                  </div>
                  <div className="diagram-stat">
                    <span className="diagram-stat-label">
                      {t('archHaulage') || 'Haulage Efficiency'}
                    </span>
                    <span className="diagram-stat-val">
                      {t('archHaulageVal') || 'Cluster Aggregation'}
                    </span>
                  </div>
                  <div className="diagram-stat">
                    <span className="diagram-stat-label">
                      {t('archResidueFate') || 'Residue Fate'}
                    </span>
                    <span className="diagram-stat-val">
                      {t('archResidueFateVal') || 'Zero Burning'}
                    </span>
                  </div>
                </div>
              </div>
            </FadeContent>
          </div>

          {/* Metric Ledger with CountUp numbers */}
          <FadeContent delay={0.35} distance={16} className="hero-metrics-bar">
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={700} suffix="M+" duration={1.8} />
              </div>
              <div className="metric-desc">
                {t('metricResidueProduced') || 'Tonnes of biomass residue produced annually in India'}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={141} suffix="M" duration={1.8} />
              </div>
              <div className="metric-desc">
                {t('metricResidueBurned') || 'Tonnes currently burned, generating seasonal air crises'}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={17} suffix="M" duration={2.0} />
              </div>
              <div className="metric-desc">
                {t('metricCo2Mitigation') || 'Tonnes CO₂ equivalent mitigation potential'}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={0} prefix="₹" duration={1.0} />
              </div>
              <div className="metric-desc">
                {t('metricFarmerRevenue') || 'Traditional farmer revenue capture from burned straw'}
              </div>
            </div>
          </FadeContent>
        </div>
      </section>

      {/* ── Continuous Feedstock & Off-Taker Marquee (LogoLoop) ── */}
      <section className="home-marquee-section">
        <div className="container">
          <div className="marquee-meta-header">
            <span className="marquee-label">
              {t('marqueeHeader') || 'Verified Industrial Off-Take Channels & Standardized Feedstocks'}
            </span>
          </div>
          <LogoLoop items={tickerFeedstocks} speed={40} gap={20} />
        </div>
      </section>

      {/* ── Two-Sided Marketplace Interface ── */}
      <section className="section home-actors">
        <div className="container">
          <FadeContent className="section-header">
            <span className="section-eyebrow">
              {t('participantsEyebrow') || 'Marketplace Participants'}
            </span>
            <BlurText
              text={
                t('participantsTitle') ||
                'Built for agricultural producers and industrial feedstock buyers.'
              }
              className="display-md"
              delay={0.04}
            />
            <p className="body-lg text-muted mt-sm" style={{ maxWidth: '640px' }}>
              {t('participantsSubtitle') ||
                'CropCycle Connect provides dedicated portals tailored to the operational requirements of agricultural cooperatives and industrial processing facilities.'}
            </p>
          </FadeContent>

          <div className="actors-grid">
            {/* Farmer Pillar */}
            <FadeContent delay={0.1} distance={24} className="actor-column">
              <div className="actor-header">
                <span className="actor-tag">{t('forProducers') || 'For Producers & FPOs'}</span>
                <h3 className="heading-lg">{t('farmerPortal') || 'Farmer Portal'}</h3>
                <p className="body-md text-muted">
                  {t('farmerPortalDesc') ||
                    'Monetize harvest residue without burning. List surplus paddy, wheat, or sugarcane straw and connect directly with verified industrial purchasers.'}
                </p>
              </div>

              <div className="actor-features">
                <div className="feature-item">
                  <div className="feature-marker">01</div>
                  <div>
                    <strong>{t('farmerStep1Title') || 'Rapid Listing Protocol:'}</strong>{' '}
                    {t('farmerStep1Desc') || 'Log crop species, volume in tonnes, and harvest availability window.'}
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">02</div>
                  <div>
                    <strong>{t('farmerStep2Title') || 'Automated Buyer Compatibility:'}</strong>{' '}
                    {t('farmerStep2Desc') || 'Immediately receive ranked buyers based on geographic proximity and required lot sizes.'}
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">03</div>
                  <div>
                    <strong>{t('farmerStep3Title') || 'Custom Logistics Preferences:'}</strong>{' '}
                    {t('farmerStep3Desc') || 'Choose on-farm collection or cooperative depot delivery.'}
                  </div>
                </div>
              </div>

              <div className="actor-action">
                <Link to="/farmer" className="btn btn-primary">
                  {t('createFarmListing') || 'Create Farm Listing'}
                </Link>
                <Link to="/matches" className="btn btn-outline">
                  {t('viewActiveDemand') || 'View Active Demand'}
                </Link>
              </div>
            </FadeContent>

            {/* Buyer Pillar */}
            <FadeContent delay={0.2} distance={24} className="actor-column">
              <div className="actor-header">
                <span className="actor-tag">{t('forBuyers') || 'For Industrial Sourcing'}</span>
                <h3 className="heading-lg">{t('buyerPortalTitle') || 'Buyer Requirements'}</h3>
                <p className="body-md text-muted">
                  {t('buyerPortalDesc') ||
                    'Secure consistent biomass raw material supplies. Define specifications, manage yard intake schedules, and aggregate nearby farm lots.'}
                </p>
              </div>

              <div className="actor-features">
                <div className="feature-item">
                  <div className="feature-marker">01</div>
                  <div>
                    <strong>{t('buyerStep1Title') || 'Precision Feedstock Criteria:'}</strong>{' '}
                    {t('buyerStep1Desc') || 'Specify accepted residue species, required batch tonnages, and maximum intake caps.'}
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">02</div>
                  <div>
                    <strong>{t('buyerStep2Title') || 'Cluster Aggregation Opportunities:'}</strong>{' '}
                    {t('buyerStep2Desc') || 'Automatically group multiple smallholder farms within 25 km into single freight deliveries.'}
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">03</div>
                  <div>
                    <strong>{t('buyerStep3Title') || 'Road Haulage Analysis:'}</strong>{' '}
                    {t('buyerStep3Desc') || 'Review turnkey route miles, estimated transit hours, and pickup coordination.'}
                  </div>
                </div>
              </div>

              <div className="actor-action">
                <Link to="/buyer" className="btn btn-primary">
                  {t('registerDemandProfile') || 'Register Demand Profile'}
                </Link>
                <Link to="/dashboard" className="btn btn-outline">
                  {t('exploreSourcingMetrics') || 'Explore Sourcing Metrics'}
                </Link>
              </div>
            </FadeContent>
          </div>
        </div>
      </section>

      {/* ── System Architecture ── */}
      <section className="section home-process" id="how-it-works">
        <div className="container">
          <FadeContent className="section-header">
            <span className="section-eyebrow">
              {t('protocolEyebrow') || 'Operating Protocol'}
            </span>
            <BlurText
              text={t('protocolTitle') || 'How the matching system executes.'}
              className="display-md"
              delay={0.04}
            />
          </FadeContent>

          <div className="process-timeline">
            {systemStages.map((s, i) => (
              <FadeContent key={s.step} delay={i * 0.1} distance={20} className="process-node">
                <div className="process-node__num">{s.step}</div>
                <h3 className="process-node__title">{s.title}</h3>
                <p className="process-node__desc">{s.desc}</p>
              </FadeContent>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feedstock Standards ── */}
      <section className="section home-feedstocks" id="feedstocks">
        <div className="container">
          <FadeContent className="section-header">
            <span className="section-eyebrow">
              {t('feedstocksEyebrow') || 'Technical Feedstock Specifications'}
            </span>
            <BlurText
              text={t('feedstocksTitle') || 'Standardized agricultural biomass matrix.'}
              className="display-md"
              delay={0.04}
            />
            <p className="body-lg text-muted mt-sm">
              {t('feedstocksSubtitle') ||
                'Standardized feedstock catalog mapped to industrial processing thresholds and energetic outputs.'}
            </p>
          </FadeContent>

          <FadeContent delay={0.15} distance={18} className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('feedstockSpecies') || 'Feedstock Species'}</th>
                  <th>{t('classification') || 'Classification'}</th>
                  <th>{t('calorificRating') || 'Calorific Rating'}</th>
                  <th>{t('targetMoisture') || 'Target Moisture'}</th>
                  <th>{t('industrialApplications') || 'Targeted Industrial Applications'}</th>
                </tr>
              </thead>
              <tbody>
                {FEEDSTOCK_SPECIFICATIONS.map((item) => (
                  <tr key={item.crop}>
                    <td className="font-semibold text-forest">{tResidue(item.crop)}</td>
                    <td><span className="badge badge-muted">{t(item.categoryKey) || item.categoryKey}</span></td>
                    <td className="font-medium">{item.calorific}</td>
                    <td>{item.moisture}</td>
                    <td className="text-muted">{t(item.usesKey) || item.usesKey}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FadeContent>
        </div>
      </section>

      {/* ── Impact & Sustainability ── */}
      <section className="section home-impact" id="impact">
        <div className="container">
          <FadeContent delay={0.1} distance={24} className="impact-card">
            <div className="impact-text-side">
              <span className="section-eyebrow" style={{ color: 'var(--color-sage)' }}>
                {t('impactEyebrow') || 'Atmospheric & Soil Stewardship'}
              </span>
              <h2 className="display-md text-white mt-xs">
                {t('impactHeadline') ||
                  'Redirecting 1 tonne of paddy straw prevents ~91 kg of greenhouse emissions.'}
              </h2>
              <p className="body-md mt-md" style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.65' }}>
                {t('impactDesc') ||
                  'Open-field residue burning disperses significant particulate matter (PM2.5, PM10), carbon monoxide, and volatile organic compounds across northern agricultural belts. By shifting agricultural biomass into industrial bioenergy and circular manufacturing, CropCycle Connect eliminates field emissions while preserving topsoil microbial vitality.'}
              </p>

              <div className="impact-metrics-row mt-xl">
                <div className="impact-col">
                  <div className="impact-col-val">3.0 kg</div>
                  <div className="impact-col-lbl">
                    {t('pmEliminated') || 'Particulate matter eliminated per tonne'}
                  </div>
                </div>
                <div className="impact-col">
                  <div className="impact-col-val">60 kg</div>
                  <div className="impact-col-lbl">
                    {t('coPrevented') || 'Carbon monoxide prevented per tonne'}
                  </div>
                </div>
                <div className="impact-col">
                  <div className="impact-col-val">100%</div>
                  <div className="impact-col-lbl">
                    {t('traceability') || 'Direct supply traceability'}
                  </div>
                </div>
              </div>
            </div>

            <div className="impact-action-side">
              <h3 className="heading-md text-white">
                {t('joinNetwork') || 'Join the Circular Network'}
              </h3>
              <p className="body-sm text-white" style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                {t('joinNetworkDesc') ||
                  'Whether you manage agricultural acreage or oversee industrial biomass intake, begin evaluating verified matches today.'}
              </p>
              <div className="flex flex-col gap-sm">
                <Link to="/matches" className="btn btn-secondary w-full">
                  {t('exploreLiveMarketplace') || 'Explore Live Marketplace'}
                </Link>
                <Link
                  to="/dashboard"
                  className="btn btn-outline w-full"
                  style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}
                >
                  {t('viewNetworkDashboard') || 'View Network Dashboard'}
                </Link>
              </div>
            </div>
          </FadeContent>
        </div>
      </section>
    </main>
  );
}
