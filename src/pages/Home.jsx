// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import './Home.css';

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '🌾',
    title: 'Farmer Lists Residue',
    desc: 'Farmers register their available crop residue — type, quantity, location, and pickup preference.',
  },
  {
    step: '02',
    icon: '🔍',
    title: 'Platform Finds Matches',
    desc: 'Our matching engine finds nearby buyers whose needs align with the listed residue type and volume.',
  },
  {
    step: '03',
    icon: '🤝',
    title: 'Connection Is Made',
    desc: 'Farmers and buyers connect directly. Logistics are coordinated based on pickup preference.',
  },
  {
    step: '04',
    icon: '♻️',
    title: 'Residue Gets Reused',
    desc: 'Instead of burning, the residue becomes biofuel, compost, animal feed, or raw material — value created, pollution avoided.',
  },
];

const IMPACT_STATS = [
  { value: '700M+', label: 'Tonnes of crop residue generated in India annually' },
  { value: '141M', label: 'Tonnes burned — 20% of total agricultural waste' },
  { value: '17M', label: 'Tonnes of CO₂ equivalent emitted per burning season' },
  { value: '₹0', label: 'Revenue farmers currently earn from burned residue' },
];

const RESIDUE_TYPES = [
  { icon: '🌾', label: 'Paddy Straw', use: 'Biofuel, Compost, Mushroom' },
  { icon: '🌿', label: 'Wheat Straw', use: 'Animal Feed, Paper' },
  { icon: '🌱', label: 'Sugarcane Bagasse', use: 'Energy, Paper & Pulp' },
  { icon: '🪴', label: 'Cotton Stalks', use: 'Bio-CNG, Compost' },
  { icon: '🌽', label: 'Maize Stalks', use: 'Animal Feed, Biochar' },
  { icon: '🥜', label: 'Groundnut Shells', use: 'Energy, Compost' },
];

export default function Home() {
  return (
    <main className="home">
      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="hero-bg-overlay" />
        <div className="hero-particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`hero-particle hero-particle--${i + 1}`}>🌿</div>
          ))}
        </div>
        <div className="container hero-content">
          <div className="hero-eyebrow animate-fadeUp">
            <span>🌱</span>
            <span>Agritech · Sustainability · Circular Economy</span>
          </div>
          <h1 className="display-xl text-white hero-headline animate-fadeUp delay-1">
            Turn Crop Residue<br />
            <span className="hero-highlight">Into Opportunity</span>
          </h1>
          <p className="body-lg hero-subtext animate-fadeUp delay-2">
            CropCycle Connect bridges the gap between farmers who have surplus crop residue and
            buyers who need it — reducing stubble burning, creating new income streams, and
            building a cleaner agricultural future.
          </p>
          <div className="hero-cta animate-fadeUp delay-3">
            <Link to="/farmer" className="btn btn-primary btn-lg">
              🌾 I'm a Farmer
            </Link>
            <Link to="/buyer" className="btn btn-secondary btn-lg">
              🏭 I'm a Buyer
            </Link>
          </div>
          <div className="hero-trust animate-fadeUp delay-4">
            <span>✓ No burning</span>
            <span>✓ Direct connections</span>
            <span>✓ New income</span>
            <span>✓ Cleaner air</span>
          </div>
        </div>

        {/* Scrolling stat bar */}
        <div className="hero-stat-bar">
          <div className="container">
            <div className="stat-grid">
              {IMPACT_STATS.map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Entry Points ── */}
      <section className="section home-entry">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Get Started</span>
            <h2 className="display-md">Who are you?</h2>
            <p className="body-lg text-muted mt-md" style={{ maxWidth: '520px', margin: '1rem auto 0' }}>
              CropCycle Connect serves both ends of the agricultural value chain.
            </p>
          </div>
          <div className="entry-cards">
            {/* Farmer card */}
            <div className="entry-card entry-card--farmer animate-fadeUp">
              <div className="entry-card__icon">🌾</div>
              <h3 className="display-md text-white">I'm a Farmer</h3>
              <p className="body-md" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7' }}>
                Have surplus paddy straw, wheat straw, or other residue? Instead of burning it,
                list it on CropCycle and connect with buyers who will pay for or collect it.
              </p>
              <ul className="entry-card__benefits">
                <li>✓ Create a free listing in under 3 minutes</li>
                <li>✓ Get matched with nearby buyers automatically</li>
                <li>✓ Choose your pickup preference</li>
                <li>✓ Keep residue details up to date easily</li>
              </ul>
              <Link to="/farmer" className="btn btn-primary btn-lg" style={{ marginTop: 'auto' }}>
                List My Residue →
              </Link>
            </div>

            {/* Buyer card */}
            <div className="entry-card entry-card--buyer animate-fadeUp delay-2">
              <div className="entry-card__icon">🏭</div>
              <h3 className="display-md text-white">I'm a Buyer</h3>
              <p className="body-md" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7' }}>
                Running a bioenergy plant, compost unit, mushroom farm, or paper mill?
                Register your demand and get connected with farmers who have what you need.
              </p>
              <ul className="entry-card__benefits">
                <li>✓ Specify residue types and quantities needed</li>
                <li>✓ Set your location and intake capacity</li>
                <li>✓ Receive relevant farmer matches</li>
                <li>✓ Streamline your raw-material sourcing</li>
              </ul>
              <Link to="/buyer" className="btn btn-warm btn-lg" style={{ marginTop: 'auto' }}>
                Register Demand →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section home-how" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Process</span>
            <h2 className="display-md">How CropCycle Works</h2>
          </div>
          <div className="how-grid">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className={`how-card animate-fadeUp delay-${i + 1}`}>
                <div className="how-card__step">{step.step}</div>
                <div className="how-card__icon">{step.icon}</div>
                <h3 className="heading-lg">{step.title}</h3>
                <p className="body-sm text-muted">{step.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && <div className="how-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Residue Types ── */}
      <section className="section home-residues" id="residue-types">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Supported Residues</span>
            <h2 className="display-md">What Can Be Matched?</h2>
            <p className="body-lg text-muted mt-md">
              We support a growing range of crop residues with multiple end-use applications.
            </p>
          </div>
          <div className="residue-grid">
            {RESIDUE_TYPES.map(({ icon, label, use }) => (
              <div key={label} className="residue-card card">
                <span className="residue-card__icon">{icon}</span>
                <h4 className="heading-sm">{label}</h4>
                <p className="body-sm text-muted">{use}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Impact Banner ── */}
      <section className="home-impact-banner" id="impact">
        <div className="container">
          <div className="impact-banner-inner">
            <div>
              <span className="section-eyebrow" style={{ background: 'rgba(212,169,106,0.2)', color: 'var(--color-tan)' }}>
                Environmental Impact
              </span>
              <h2 className="display-md text-white mt-md">
                Every tonne redirected<br />saves ~91 kg of CO₂
              </h2>
              <p className="body-lg mt-md" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Burning 1 tonne of paddy straw releases roughly 3 kg of particulate matter,
                1.46 kg of reactive gases, and 70 kg of CO. CropCycle turns that into zero.
              </p>
            </div>
            <div className="impact-cta">
              <Link to="/matches" className="btn btn-primary btn-lg">Browse Matches</Link>
              <Link to="/dashboard" className="btn btn-secondary btn-lg">View Dashboard</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
