import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Farmer from './pages/Farmer';
import Buyer from './pages/Buyer';
import Matches from './pages/Matches';
import MatchDetails from './pages/MatchDetails';
import Dashboard from './pages/Dashboard';
import './App.css';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
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
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/"                    element={<Home />} />
          <Route path="/farmer"              element={<Farmer />} />
          <Route path="/buyer"               element={<Buyer />} />
          <Route path="/matches"             element={<Matches />} />
          <Route path="/match-details/:buyerId" element={<MatchDetails />} />
          <Route path="/dashboard"           element={<Dashboard />} />
          {/* 404 fallback */}
          <Route path="*" element={
            <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', paddingTop: '72px' }}>
              <span style={{ fontSize: '4rem' }}>🌾</span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>Page Not Found</h1>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </div>
          } />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
