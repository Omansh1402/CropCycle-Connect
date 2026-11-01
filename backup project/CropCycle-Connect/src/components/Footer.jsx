// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import './Footer.css';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer__grid">
          {/* Brand Column */}
          <div className="footer__col footer__col--brand">
            <Link to="/" className="footer__brand" aria-label="CropCycle Connect Home">
              <div className="logo-symbol" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.477 2 2 6.477 2 12C2 14.83 3.177 17.388 5.07 19.21L6.48 17.79C4.94 16.32 4 14.27 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 14.27 19.06 16.32 17.52 17.79L18.93 19.21C20.823 17.388 22 14.83 22 12C22 6.477 17.523 2 12 2Z"
                    fill="currentColor"
                  />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span className="footer__logo-title">CropCycle Connect</span>
            </Link>
            <p className="footer__desc">
              {t('footerDesc') ||
                'National agricultural biomass aggregation and matching platform. Connecting farm cooperatives with bioenergy facilities, paper mills, and industrial composters to end seasonal stubble burning.'}
            </p>
            <div className="footer__security-badge">
              <span className="security-dot" />
              <span>{t('securityBadgeText') || 'Verified Circular Sourcing Protocol'}</span>
            </div>
          </div>

          {/* Marketplace Navigation */}
          <div className="footer__col">
            <h4 className="footer__heading">{t('marketplace') || 'Marketplace'}</h4>
            <ul className="footer__links">
              <li><Link to="/farmer">{t('farmerListingsNav') || 'Farmer Listings'}</Link></li>
              <li><Link to="/buyer">{t('buyerRequirementsNav') || 'Buyer Requirements'}</Link></li>
              <li><Link to="/matches">{t('liveMatchingEngineNav') || 'Live Matching Engine'}</Link></li>
              <li><Link to="/dashboard">{t('operationsDashboardNav') || 'Operations Dashboard'}</Link></li>
            </ul>
          </div>

          {/* Technology & Framework */}
          <div className="footer__col">
            <h4 className="footer__heading">{t('navArchitecture') || 'Architecture'}</h4>
            <ul className="footer__links">
              <li><Link to="/#how-it-works">{t('fiveDimMatching') || '5-Dimension Matching'}</Link></li>
              <li><Link to="/#feedstocks">{t('feedstockStandards') || 'Feedstock Standards'}</Link></li>
              <li><Link to="/#impact">{t('emissionsModel') || 'Emissions Model'}</Link></li>
              <li><Link to="/dashboard#audit">{t('logisticsAggregation') || 'Logistics Aggregation'}</Link></li>
            </ul>
          </div>

          {/* Operations & Standards */}
          <div className="footer__col">
            <h4 className="footer__heading">{t('navGovernance') || 'Governance'}</h4>
            <p className="footer__subtext">
              {t('governanceSubtext') ||
                'Demonstration environment. Supply chain records and partner profiles follow Indian Agricultural Waste Management and Bio-CNG guidelines.'}
            </p>
            <div className="footer__status">
              <span className="status-indicator-live" />
              <span>{t('engineConnected') || 'Supabase Engine Connected'}</span>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__copyright">
            © {CURRENT_YEAR} CropCycle Connect Inc. {t('allRightsReserved') || 'All rights reserved.'}
          </div>
          <div className="footer__legal-links">
            <span className="footer__legal-item">{t('supplyVerificationProtocol') || 'Supply Verification Protocol'}</span>
            <span className="footer__legal-divider">·</span>
            <span className="footer__legal-item">{t('cleanAirInitiative') || 'Clean Air Initiative'}</span>
            <span className="footer__legal-divider">·</span>
            <span className="footer__legal-item">{t('termsOfOperation') || 'Terms of Operation'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
