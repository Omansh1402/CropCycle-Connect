import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { LanguageProvider } from './lib/i18n';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { LoadingSpinner } from './components/DbStatus';
import './App.css';

// Route-level code splitting via React.lazy()
const Home = lazy(() => import('./pages/Home'));
const Farmer = lazy(() => import('./pages/Farmer'));
const Buyer = lazy(() => import('./pages/Buyer'));
const Matches = lazy(() => import('./pages/Matches'));
const MatchDetails = lazy(() => import('./pages/MatchDetails'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MarketIntelligence = lazy(() => import('./pages/MarketIntelligence'));

function RouteLoadingFallback() {
  return (
    <div className="page-loading-shell" role="status" aria-live="polite">
      <LoadingSpinner label="Loading application…" />
    </div>
  );
}

// Global scroll observer for smooth entrance animations
function ScrollRevealManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -30px 0px', threshold: 0.08 }
    );

    const observeElements = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        observer.observe(el);
      });
    };

    observeElements();
    const t1 = setTimeout(observeElements, 120);
    const t2 = setTimeout(observeElements, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}

// Scroll to top or target hash on route change
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace(/^#/, '');
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return null;
}

// Layout wrapper with navbar padding
function Layout({ children }) {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="app-shell">
      <Navbar />
      <div className={isHome ? 'page-wrapper page-wrapper--home' : 'page-wrapper'}>
        {children}
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <ScrollToTop />
        <ScrollRevealManager />
        <Layout>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/market-intelligence" element={<MarketIntelligence />} />
              <Route path="/farmer" element={<Farmer />} />
              <Route path="/buyer" element={<Buyer />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/match-details/:buyerId" element={<MatchDetails />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* 404 fallback */}
              <Route
                path="*"
                element={
                  <div className="not-found-container">
                    <div className="not-found-code">404</div>
                    <h1 className="not-found-title">Page Not Found</h1>
                    <p className="not-found-desc">
                      The requested URL could not be found or has moved to an updated path in the agricultural marketplace.
                    </p>
                    <Link to="/" className="btn btn-primary">
                      Return to Home
                    </Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </LanguageProvider>
  );
}
