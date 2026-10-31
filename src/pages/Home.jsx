// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SplitText from '../components/reactbits/SplitText';
import BlurText from '../components/reactbits/BlurText';
import RotatingText from '../components/reactbits/RotatingText';
import Waves from '../components/reactbits/Waves';
import LogoLoop from '../components/reactbits/LogoLoop';
import CountUp from '../components/reactbits/CountUp';
import FadeContent from '../components/reactbits/FadeContent';
import './Home.css';

export default function Home() {
  const { t, i18n } = useTranslation();

  const stages = [
    {
      step: '01',
      title: t('home.stage1Title'),
      desc: t('home.stage1Desc'),
    },
    {
      step: '02',
      title: t('home.stage2Title'),
      desc: t('home.stage2Desc'),
    },
    {
      step: '03',
      title: t('home.stage3Title'),
      desc: t('home.stage3Desc'),
    },
    {
      step: '04',
      title: t('home.stage4Title'),
      desc: t('home.stage4Desc'),
    },
  ];

  const feedstockSpecs = [
    {
      crop: t('crops.Paddy Straw', 'Paddy Straw'),
      category: t('categories.Cereal Residue', 'Cereal Residue'),
      calorific: '~3,200 kcal/kg',
      moisture: '< 15%',
      primaryUses: t('home.usesPaddy', 'Bio-CNG, Bioethanol, Particle Board, Mushroom Beds'),
    },
    {
      crop: t('crops.Wheat Straw', 'Wheat Straw'),
      category: t('categories.Cereal Residue', 'Cereal Residue'),
      calorific: '~3,400 kcal/kg',
      moisture: '< 12%',
      primaryUses: t('home.usesWheat', 'Fodder Pellets, Cellulose Paper, Eco-Packaging'),
    },
    {
      crop: t('crops.Sugarcane Bagasse', 'Sugarcane Bagasse'),
      category: t('categories.Agro-Industrial', 'Agro-Industrial'),
      calorific: '~2,200 kcal/kg (wet)',
      moisture: '< 50%',
      primaryUses: t('home.usesBagasse', 'Cogeneration Power, Pulp & Paper, Molded Tableware'),
    },
    {
      crop: t('crops.Cotton Stalks', 'Cotton Stalks'),
      category: t('categories.Woody Biomass', 'Woody Biomass'),
      calorific: '~3,900 kcal/kg',
      moisture: '< 14%',
      primaryUses: t('home.usesCotton', 'Industrial Pellets, Bio-Coal, Briquetting'),
    },
    {
      crop: t('crops.Maize Stover', 'Maize Stover'),
      category: t('categories.Cereal Residue', 'Cereal Residue'),
      calorific: '~3,800 kcal/kg',
      moisture: '< 15%',
      primaryUses: t('home.usesMaize', 'Animal Fodder, Cellulosic Fuel, Biochar'),
    },
    {
      crop: t('crops.Groundnut Shells', 'Groundnut Shells'),
      category: t('categories.Husk / Shell', 'Husk / Shell'),
      calorific: '~4,200 kcal/kg',
      moisture: '< 10%',
      primaryUses: t('home.usesGroundnut', 'High-Density Boiler Briquettes, Activated Carbon'),
    },
  ];

  const tickerFeedstocks = [
    { title: t('home.ticker.paddyStraw'), subtitle: t('home.ticker.paddyCal') },
    { title: t('home.ticker.bioCng'), subtitle: t('home.ticker.satat') },
    { title: t('home.ticker.wheatStraw'), subtitle: t('home.ticker.celluloseFodder') },
    { title: t('home.ticker.paperMills'), subtitle: t('home.ticker.recycledPackaging') },
    { title: t('home.ticker.bagasse'), subtitle: t('home.ticker.cogenPower') },
    { title: t('home.ticker.biochar'), subtitle: t('home.ticker.carbonSeq') },
    { title: t('home.ticker.cottonStalks'), subtitle: t('home.ticker.densePellets') },
    { title: t('home.ticker.maizeStover'), subtitle: t('home.ticker.biofuelFeed') },
    { title: t('home.ticker.boilers'), subtitle: t('home.ticker.thermalFiring') },
  ];

  const rotatingTexts = t('home.heroRotatingTexts', { returnObjects: true }) || [
    'Bio-CNG Refineries',
    'Cellulosic Ethanol Plants',
    'Paper & Pulp Mills',
    'Biochar Producers',
    'Thermal Co-Firing Boilers',
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
                <span>{t('home.heroEyebrow')}</span>
              </div>

              <SplitText
                key={`hero-headline-${i18n.language}`}
                text={t('home.heroHeadline')}
                tag="h1"
                className="display-xl hero-headline"
                delay={0.03}
                duration={0.65}
              />

              <div className="body-lg hero-subtext">
                {t('home.heroSubtextPrefix')}{' '}
                <RotatingText
                  key={`rotating-${i18n.language}`}
                  texts={Array.isArray(rotatingTexts) ? rotatingTexts : [rotatingTexts]}
                  highlight={true}
                  highlightColor="rgba(49, 91, 67, 0.12)"
                  style={{ color: '#193B2B', fontWeight: 700 }}
                  rotationInterval={2800}
                />
                {' '}{t('home.heroSubtextSuffix')}
              </div>

              <FadeContent delay={0.2} distance={18}>
                <div className="hero-cta">
                  <Link to="/farmer" className="btn btn-primary btn-lg">
                    {t('home.listResidue')}
                  </Link>
                  <Link to="/buyer" className="btn btn-secondary btn-lg">
                    {t('home.registerDemand')}
                  </Link>
                </div>

                <div className="hero-metadata">
                  <div className="hero-meta-item">
                    <span className="meta-dot" />
                    <span>{t('home.metaCoords')}</span>
                  </div>
                  <div className="hero-meta-item">
                    <span className="meta-dot" />
                    <span>{t('home.metaHaulage')}</span>
                  </div>
                  <div className="hero-meta-item">
                    <span className="meta-dot" />
                    <span>{t('home.metaMarkups')}</span>
                  </div>
                </div>
              </FadeContent>
            </div>

            {/* Architectural Flow Diagram */}
            <FadeContent delay={0.25} distance={20} className="hero-visual">
              <div className="architecture-diagram">
                <div className="diagram-header">
                  <span className="diagram-title">{t('home.diagramTitle')}</span>
                  <span className="diagram-status">{t('home.diagramOnline')}</span>
                </div>

                <div className="diagram-body">
                  <div className="diagram-node">
                    <span className="node-num">01</span>
                    <div className="node-info">
                      <div className="node-label">{t('home.stage1Label')}</div>
                      <div className="node-detail">{t('home.stage1Detail')}</div>
                    </div>
                  </div>

                  <div className="diagram-connector">
                    <div className="connector-line" />
                    <span className="connector-tag">{t('home.connector1')}</span>
                  </div>

                  <div className="diagram-node diagram-node--engine">
                    <span className="node-num">02</span>
                    <div className="node-info">
                      <div className="node-label">{t('home.stage2Label')}</div>
                      <div className="node-detail">{t('home.stage2Detail')}</div>
                    </div>
                  </div>

                  <div className="diagram-connector">
                    <div className="connector-line" />
                    <span className="connector-tag">{t('home.connector2')}</span>
                  </div>

                  <div className="diagram-node">
                    <span className="node-num">03</span>
                    <div className="node-info">
                      <div className="node-label">{t('home.stage3Label')}</div>
                      <div className="node-detail">{t('home.stage3Detail')}</div>
                    </div>
                  </div>
                </div>

                <div className="diagram-footer">
                  <div className="diagram-stat">
                    <span className="diagram-stat-label">{t('home.statPrecision')}</span>
                    <span className="diagram-stat-val">{t('home.statPrecisionVal')}</span>
                  </div>
                  <div className="diagram-stat">
                    <span className="diagram-stat-label">{t('home.statHaulage')}</span>
                    <span className="diagram-stat-val">{t('home.statHaulageVal')}</span>
                  </div>
                  <div className="diagram-stat">
                    <span className="diagram-stat-label">{t('home.statFate')}</span>
                    <span className="diagram-stat-val">{t('home.statFateVal')}</span>
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
              <div className="metric-desc">{t('home.metricBiomassProduced')}</div>
            </div>
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={141} suffix="M" duration={1.8} />
              </div>
              <div className="metric-desc">{t('home.metricBiomassBurned')}</div>
            </div>
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={17} suffix="M" duration={2.0} />
              </div>
              <div className="metric-desc">{t('home.metricCo2Potential')}</div>
            </div>
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={0} prefix="₹" duration={1.0} />
              </div>
              <div className="metric-desc">{t('home.metricFarmerRevenue')}</div>
            </div>
          </FadeContent>
        </div>
      </section>

      {/* ── Continuous Feedstock & Off-Taker Marquee (LogoLoop) ── */}
      <section className="home-marquee-section">
        <div className="container">
          <div className="marquee-meta-header">
            <span className="marquee-label">{t('home.marqueeLabel')}</span>
          </div>
          <LogoLoop items={tickerFeedstocks} speed={40} gap={20} />
        </div>
      </section>

      {/* ── Two-Sided Marketplace Interface ── */}
      <section className="section home-actors">
        <div className="container">
          <FadeContent className="section-header">
            <span className="section-eyebrow">{t('home.participantsEyebrow')}</span>
            <BlurText
              key={`actors-headline-${i18n.language}`}
              text={t('home.participantsHeadline')}
              className="display-md"
              delay={0.04}
            />
            <p className="body-lg text-muted mt-sm" style={{ maxWidth: '640px' }}>
              {t('home.participantsDesc')}
            </p>
          </FadeContent>

          <div className="actors-grid">
            {/* Farmer Pillar */}
            <FadeContent delay={0.1} distance={24} className="actor-column">
              <div className="actor-header">
                <span className="actor-tag">{t('home.forFarmers')}</span>
                <h3 className="heading-lg">{t('home.farmerPortal')}</h3>
                <p className="body-md text-muted">
                  {t('home.farmerPortalDesc')}
                </p>
              </div>

              <div className="actor-features">
                <div className="feature-item">
                  <div className="feature-marker">01</div>
                  <div>
                    <strong>{t('home.farmerFeat1Title')}</strong> {t('home.farmerFeat1Desc')}
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">02</div>
                  <div>
                    <strong>{t('home.farmerFeat2Title')}</strong> {t('home.farmerFeat2Desc')}
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">03</div>
                  <div>
                    <strong>{t('home.farmerFeat3Title')}</strong> {t('home.farmerFeat3Desc')}
                  </div>
                </div>
              </div>

              <div className="actor-action">
                <Link to="/farmer" className="btn btn-primary">
                  {t('home.createListing')}
                </Link>
                <Link to="/matches" className="btn btn-outline">
                  {t('home.viewActiveDemand')}
                </Link>
              </div>
            </FadeContent>

            {/* Buyer Pillar */}
            <FadeContent delay={0.2} distance={24} className="actor-column">
              <div className="actor-header">
                <span className="actor-tag">{t('home.forBuyers')}</span>
                <h3 className="heading-lg">{t('home.buyerPortal')}</h3>
                <p className="body-md text-muted">
                  {t('home.buyerPortalDesc')}
                </p>
              </div>

              <div className="actor-features">
                <div className="feature-item">
                  <div className="feature-marker">01</div>
                  <div>
                    <strong>{t('home.buyerFeat1Title')}</strong> {t('home.buyerFeat1Desc')}
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">02</div>
                  <div>
                    <strong>{t('home.buyerFeat2Title')}</strong> {t('home.buyerFeat2Desc')}
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">03</div>
                  <div>
                    <strong>{t('home.buyerFeat3Title')}</strong> {t('home.buyerFeat3Desc')}
                  </div>
                </div>
              </div>

              <div className="actor-action">
                <Link to="/buyer" className="btn btn-primary">
                  {t('home.registerDemandProfile')}
                </Link>
                <Link to="/dashboard" className="btn btn-outline">
                  {t('home.exploreMetrics')}
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
            <span className="section-eyebrow">{t('home.operatingProtocol')}</span>
            <BlurText
              key={`process-headline-${i18n.language}`}
              text={t('home.howSystemExecutes')}
              className="display-md"
              delay={0.04}
            />
          </FadeContent>

          <div className="process-timeline">
            {stages.map((s, i) => (
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
            <span className="section-eyebrow">{t('home.feedstockEyebrow')}</span>
            <BlurText
              key={`feedstocks-headline-${i18n.language}`}
              text={t('home.feedstockHeadline')}
              className="display-md"
              delay={0.04}
            />
            <p className="body-lg text-muted mt-sm">
              {t('home.feedstockDesc')}
            </p>
          </FadeContent>

          <FadeContent delay={0.15} distance={18} className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('home.thSpecies')}</th>
                  <th>{t('home.thClassification')}</th>
                  <th>{t('home.thCalorific')}</th>
                  <th>{t('home.thMoisture')}</th>
                  <th>{t('home.thApplications')}</th>
                </tr>
              </thead>
              <tbody>
                {feedstockSpecs.map((item) => (
                  <tr key={item.crop}>
                    <td className="font-semibold text-forest">{item.crop}</td>
                    <td><span className="badge badge-muted">{item.category}</span></td>
                    <td className="font-medium">{item.calorific}</td>
                    <td>{item.moisture}</td>
                    <td className="text-muted">{item.primaryUses}</td>
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
                {t('home.impactEyebrow')}
              </span>
              <h2 className="display-md text-white mt-xs">
                {t('home.impactHeadline')}
              </h2>
              <p className="body-md mt-md" style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.65' }}>
                {t('home.impactDesc')}
              </p>

              <div className="impact-metrics-row mt-xl">
                <div className="impact-col">
                  <div className="impact-col-val">{t('home.particulateMetric')}</div>
                  <div className="impact-col-lbl">{t('home.particulateLabel')}</div>
                </div>
                <div className="impact-col">
                  <div className="impact-col-val">{t('home.coMetric')}</div>
                  <div className="impact-col-lbl">{t('home.coLabel')}</div>
                </div>
                <div className="impact-col">
                  <div className="impact-col-val">{t('home.traceabilityMetric')}</div>
                  <div className="impact-col-lbl">{t('home.traceabilityLabel')}</div>
                </div>
              </div>
            </div>

            <div className="impact-action-side">
              <h3 className="heading-md text-white">{t('home.joinNetwork')}</h3>
              <p className="body-sm text-white" style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                {t('home.joinDesc')}
              </p>
              <div className="flex flex-col gap-sm">
                <Link to="/matches" className="btn btn-secondary w-full">
                  {t('home.exploreMarketplace')}
                </Link>
                <Link to="/dashboard" className="btn btn-outline w-full" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}>
                  {t('home.viewDashboard')}
                </Link>
              </div>
            </div>
          </FadeContent>
        </div>
      </section>
    </main>
  );
}
