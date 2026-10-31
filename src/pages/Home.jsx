// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import SplitText from '../components/reactbits/SplitText';
import BlurText from '../components/reactbits/BlurText';
import RotatingText from '../components/reactbits/RotatingText';
import Waves from '../components/reactbits/Waves';
import LogoLoop from '../components/reactbits/LogoLoop';
import CountUp from '../components/reactbits/CountUp';
import FadeContent from '../components/reactbits/FadeContent';
import './Home.css';

const SYSTEM_STAGES = [
  {
    step: '01',
    title: 'Cluster Supply Logging',
    desc: 'Farmers and FPOs record available lot volumes, residue species, field coordinates, and harvest windows.',
  },
  {
    step: '02',
    title: 'Multi-Factor Engine',
    desc: 'Our deterministic algorithm evaluates quantity fit (40%), distance (30%), intake capacity (20%), and use-case synergy (10%).',
  },
  {
    step: '03',
    title: 'Logistics Aggregation',
    desc: 'Smallholder volumes within a 15 km radius are grouped into full freight batches to minimize transport overhead.',
  },
  {
    step: '04',
    title: 'Circular Conversion',
    desc: 'Residue is routed to bio-CNG plants, paper mills, and animal feed units — eliminating open burning permanently.',
  },
];

const FEEDSTOCK_SPECIFICATIONS = [
  {
    crop: 'Paddy Straw',
    category: 'Cereal Residue',
    calorific: '~3,200 kcal/kg',
    moisture: '< 15%',
    primaryUses: 'Bio-CNG, Bioethanol, Particle Board, Mushroom Beds',
  },
  {
    crop: 'Wheat Straw',
    category: 'Cereal Residue',
    calorific: '~3,400 kcal/kg',
    moisture: '< 12%',
    primaryUses: 'Fodder Pellets, Cellulose Paper, Eco-Packaging',
  },
  {
    crop: 'Sugarcane Bagasse',
    category: 'Agro-Industrial',
    calorific: '~2,200 kcal/kg (wet)',
    moisture: '< 50%',
    primaryUses: 'Cogeneration Power, Pulp & Paper, Molded Tableware',
  },
  {
    crop: 'Cotton Stalks',
    category: 'Woody Biomass',
    calorific: '~3,900 kcal/kg',
    moisture: '< 14%',
    primaryUses: 'Industrial Pellets, Bio-Coal, Briquetting',
  },
  {
    crop: 'Maize Stover',
    category: 'Cereal Residue',
    calorific: '~3,800 kcal/kg',
    moisture: '< 15%',
    primaryUses: 'Animal Fodder, Cellulosic Fuel, Biochar',
  },
  {
    crop: 'Groundnut Shells',
    category: 'Husk / Shell',
    calorific: '~4,200 kcal/kg',
    moisture: '< 10%',
    primaryUses: 'High-Density Boiler Briquettes, Activated Carbon',
  },
];

const TICKER_FEEDSTOCKS = [
  { title: 'Paddy Straw', subtitle: '3,200 kcal/kg' },
  { title: 'Bio-CNG Refineries', subtitle: 'SATAT Protocol' },
  { title: 'Wheat Straw', subtitle: 'Cellulose & Fodder' },
  { title: 'Cellulosic Paper Mills', subtitle: 'Recycled Packaging' },
  { title: 'Sugarcane Bagasse', subtitle: 'Cogeneration Power' },
  { title: 'Biochar Facilities', subtitle: 'Carbon Sequestration' },
  { title: 'Cotton Stalks', subtitle: 'High-Density Pellets' },
  { title: 'Maize Stover', subtitle: 'Biofuel & Feed' },
  { title: 'Industrial Boilers', subtitle: 'Thermal Co-Firing' },
];

export default function Home() {
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
                <span>National Agricultural Biomass Exchange</span>
              </div>

              <SplitText
                text="Architecting the circular supply chain for crop residue."
                tag="h1"
                className="display-xl hero-headline"
                delay={0.03}
                duration={0.65}
              />

              <div className="body-lg hero-subtext">
                CropCycle Connect operates a verified marketplace and routing engine matching
                agricultural cooperatives with{' '}
                <RotatingText
                  texts={[
                    'Bio-CNG Refineries',
                    'Cellulosic Ethanol Plants',
                    'Paper & Pulp Mills',
                    'Biochar Producers',
                    'Thermal Co-Firing Boilers',
                  ]}
                  highlight={true}
                  highlightColor="rgba(49, 91, 67, 0.12)"
                  style={{ color: '#193B2B', fontWeight: 700 }}
                  rotationInterval={2800}
                />
                {' '}— converting seasonal field burning into quantifiable economic and atmospheric value.
              </div>

              <FadeContent delay={0.2} distance={18}>
                <div className="hero-cta">
                  <Link to="/farmer" className="btn btn-primary btn-lg">
                    List Farm Residue
                  </Link>
                  <Link to="/buyer" className="btn btn-secondary btn-lg">
                    Register Demand
                  </Link>
                </div>

                <div className="hero-metadata">
                  <div className="hero-meta-item">
                    <span className="meta-dot" />
                    <span>Verified Farm Coordinates</span>
                  </div>
                  <div className="hero-meta-item">
                    <span className="meta-dot" />
                    <span>Real-Time Road Haulage Calculation</span>
                  </div>
                  <div className="hero-meta-item">
                    <span className="meta-dot" />
                    <span>Zero Commercial Intermediary Markups</span>
                  </div>
                </div>
              </FadeContent>
            </div>

            {/* Architectural Flow Diagram */}
            <FadeContent delay={0.25} distance={20} className="hero-visual">
              <div className="architecture-diagram">
                <div className="diagram-header">
                  <span className="diagram-title">System Pipeline · Dual Sided Protocol</span>
                  <span className="diagram-status">Online</span>
                </div>

                <div className="diagram-body">
                  <div className="diagram-node">
                    <span className="node-num">01</span>
                    <div className="node-info">
                      <div className="node-label">Farm Supply Point</div>
                      <div className="node-detail">Farmer & FPO Lot Registration · GPS & Moisture</div>
                    </div>
                  </div>

                  <div className="diagram-connector">
                    <div className="connector-line" />
                    <span className="connector-tag">Aggregation & Batching</span>
                  </div>

                  <div className="diagram-node diagram-node--engine">
                    <span className="node-num">02</span>
                    <div className="node-info">
                      <div className="node-label">5-Dimension Matching Algorithm</div>
                      <div className="node-detail">40% Quantity · 30% Proximity · 20% Capacity · 10% End-Use</div>
                    </div>
                  </div>

                  <div className="diagram-connector">
                    <div className="connector-line" />
                    <span className="connector-tag">Road Routing API</span>
                  </div>

                  <div className="diagram-node">
                    <span className="node-num">03</span>
                    <div className="node-info">
                      <div className="node-label">Industrial Refinery Hub</div>
                      <div className="node-detail">Bio-CNG · Paper Mill · Packaging · Livestock Feed</div>
                    </div>
                  </div>
                </div>

                <div className="diagram-footer">
                  <div className="diagram-stat">
                    <span className="diagram-stat-label">Algorithmic Precision</span>
                    <span className="diagram-stat-val">100 pt Scale</span>
                  </div>
                  <div className="diagram-stat">
                    <span className="diagram-stat-label">Haulage Efficiency</span>
                    <span className="diagram-stat-val">Cluster Aggregation</span>
                  </div>
                  <div className="diagram-stat">
                    <span className="diagram-stat-label">Residue Fate</span>
                    <span className="diagram-stat-val">Zero Burning</span>
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
              <div className="metric-desc">Tonnes of biomass residue produced annually in India</div>
            </div>
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={141} suffix="M" duration={1.8} />
              </div>
              <div className="metric-desc">Tonnes currently burned, generating seasonal air crises</div>
            </div>
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={17} suffix="M" duration={2.0} />
              </div>
              <div className="metric-desc">Tonnes CO₂ equivalent mitigation potential</div>
            </div>
            <div className="metric-box">
              <div className="metric-num">
                <CountUp to={0} prefix="₹" duration={1.0} />
              </div>
              <div className="metric-desc">Traditional farmer revenue capture from burned straw</div>
            </div>
          </FadeContent>
        </div>
      </section>

      {/* ── Continuous Feedstock & Off-Taker Marquee (LogoLoop) ── */}
      <section className="home-marquee-section">
        <div className="container">
          <div className="marquee-meta-header">
            <span className="marquee-label">Verified Industrial Off-Take Channels & Standardized Feedstocks</span>
          </div>
          <LogoLoop items={TICKER_FEEDSTOCKS} speed={40} gap={20} />
        </div>
      </section>

      {/* ── Two-Sided Marketplace Interface ── */}
      <section className="section home-actors">
        <div className="container">
          <FadeContent className="section-header">
            <span className="section-eyebrow">Marketplace Participants</span>
            <BlurText
              text="Built for agricultural producers and industrial feedstock buyers."
              className="display-md"
              delay={0.04}
            />
            <p className="body-lg text-muted mt-sm" style={{ maxWidth: '640px' }}>
              CropCycle Connect provides dedicated portals tailored to the operational requirements
              of agricultural cooperatives and industrial processing facilities.
            </p>
          </FadeContent>

          <div className="actors-grid">
            {/* Farmer Pillar */}
            <FadeContent delay={0.1} distance={24} className="actor-column">
              <div className="actor-header">
                <span className="actor-tag">For Producers & FPOs</span>
                <h3 className="heading-lg">Farmer Portal</h3>
                <p className="body-md text-muted">
                  Monetize harvest residue without burning. List surplus paddy, wheat, or sugarcane
                  straw and connect directly with verified industrial purchasers.
                </p>
              </div>

              <div className="actor-features">
                <div className="feature-item">
                  <div className="feature-marker">01</div>
                  <div>
                    <strong>Rapid Listing Protocol:</strong> Log crop species, volume in tonnes, and harvest availability window.
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">02</div>
                  <div>
                    <strong>Automated Buyer Compatibility:</strong> Immediately receive ranked buyers based on geographic proximity and required lot sizes.
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">03</div>
                  <div>
                    <strong>Custom Logistics Preferences:</strong> Choose on-farm collection or cooperative depot delivery.
                  </div>
                </div>
              </div>

              <div className="actor-action">
                <Link to="/farmer" className="btn btn-primary">
                  Create Farm Listing
                </Link>
                <Link to="/matches" className="btn btn-outline">
                  View Active Demand
                </Link>
              </div>
            </FadeContent>

            {/* Buyer Pillar */}
            <FadeContent delay={0.2} distance={24} className="actor-column">
              <div className="actor-header">
                <span className="actor-tag">For Industrial Sourcing</span>
                <h3 className="heading-lg">Buyer Portal</h3>
                <p className="body-md text-muted">
                  Secure consistent biomass raw material supplies. Define specifications, manage yard intake
                  schedules, and aggregate nearby farm lots.
                </p>
              </div>

              <div className="actor-features">
                <div className="feature-item">
                  <div className="feature-marker">01</div>
                  <div>
                    <strong>Precision Feedstock Criteria:</strong> Specify accepted residue species, required batch tonnages, and maximum intake caps.
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">02</div>
                  <div>
                    <strong>Cluster Aggregation Opportunities:</strong> Automatically group multiple smallholder farms within 25 km into single freight deliveries.
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-marker">03</div>
                  <div>
                    <strong>Road Haulage Analysis:</strong> Review turnkey route miles, estimated transit hours, and pickup coordination.
                  </div>
                </div>
              </div>

              <div className="actor-action">
                <Link to="/buyer" className="btn btn-primary">
                  Register Demand Profile
                </Link>
                <Link to="/dashboard" className="btn btn-outline">
                  Explore Sourcing Metrics
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
            <span className="section-eyebrow">Operating Protocol</span>
            <BlurText text="How the matching system executes." className="display-md" delay={0.04} />
          </FadeContent>

          <div className="process-timeline">
            {SYSTEM_STAGES.map((s, i) => (
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
            <span className="section-eyebrow">Technical Feedstock Specifications</span>
            <BlurText text="Standardized agricultural biomass matrix." className="display-md" delay={0.04} />
            <p className="body-lg text-muted mt-sm">
              Standardized feedstock catalog mapped to industrial processing thresholds and energetic outputs.
            </p>
          </FadeContent>

          <FadeContent delay={0.15} distance={18} className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Feedstock Species</th>
                  <th>Classification</th>
                  <th>Calorific Rating</th>
                  <th>Target Moisture</th>
                  <th>Targeted Industrial Applications</th>
                </tr>
              </thead>
              <tbody>
                {FEEDSTOCK_SPECIFICATIONS.map((item) => (
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
                Atmospheric & Soil Stewardship
              </span>
              <h2 className="display-md text-white mt-xs">
                Redirecting 1 tonne of paddy straw prevents ~91 kg of greenhouse emissions.
              </h2>
              <p className="body-md mt-md" style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.65' }}>
                Open-field residue burning disperses significant particulate matter (PM2.5, PM10),
                carbon monoxide, and volatile organic compounds across northern agricultural belts.
                By shifting agricultural biomass into industrial bioenergy and circular manufacturing,
                CropCycle Connect eliminates field emissions while preserving topsoil microbial vitality.
              </p>

              <div className="impact-metrics-row mt-xl">
                <div className="impact-col">
                  <div className="impact-col-val">3.0 kg</div>
                  <div className="impact-col-lbl">Particulate matter eliminated per tonne</div>
                </div>
                <div className="impact-col">
                  <div className="impact-col-val">60 kg</div>
                  <div className="impact-col-lbl">Carbon monoxide prevented per tonne</div>
                </div>
                <div className="impact-col">
                  <div className="impact-col-val">100%</div>
                  <div className="impact-col-lbl">Direct supply traceability</div>
                </div>
              </div>
            </div>

            <div className="impact-action-side">
              <h3 className="heading-md text-white">Join the Circular Network</h3>
              <p className="body-sm text-white" style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                Whether you manage agricultural acreage or oversee industrial biomass intake,
                begin evaluating verified matches today.
              </p>
              <div className="flex flex-col gap-sm">
                <Link to="/matches" className="btn btn-secondary w-full">
                  Explore Live Marketplace
                </Link>
                <Link to="/dashboard" className="btn btn-outline w-full" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}>
                  View Network Dashboard
                </Link>
              </div>
            </div>
          </FadeContent>
        </div>
      </section>
    </main>
  );
}
