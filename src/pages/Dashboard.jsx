import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchFarmerListings,
  fetchBuyerRequirements,
  fetchContactRequests,
  fetchDashboardStats,
  formatDbError,
} from '../lib/db';
import { isConfigured } from '../lib/supabase';
import { sampleListings, sampleBuyers, sampleMatches, dashboardStats as staticStats } from '../data/sampleData';
import { DbSetupBanner, DbErrorAlert, LoadingSpinner } from '../components/DbStatus';
import { findCollectionGroupings } from '../lib/matchingEngine';
import './Dashboard.css';

const STATUS_BADGE = {
  active:   'badge-green',
  pending:  'badge-warm',
  matched:  'badge-blue',
  closed:   'badge-muted',
  // contact_requests
  'pending-req': 'badge-warm',
  accepted:      'badge-green',
  rejected:      'badge-muted',
  completed:     'badge-blue',
  // legacy sample data values
  Active:   'badge-green',
  Pending:  'badge-warm',
  Matched:  'badge-blue',
  Accepted: 'badge-green',
  'Pending Response': 'badge-warm',
};

function useDbData() {
  const [listings,  setListings]  = useState(null);
  const [buyers,    setBuyers]    = useState(null);
  const [requests,  setRequests]  = useState(null);
  const [kpis,      setKpis]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchAll = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const [lRes, bRes, rRes, kRes] = await Promise.all([
        fetchFarmerListings(),
        fetchBuyerRequirements(),
        fetchContactRequests(),
        fetchDashboardStats(),
      ]);

      const firstError = [lRes, bRes, rRes, kRes].find((r) => r.error);
      if (firstError) {
        setError(formatDbError(firstError.error));
        return;
      }

      setListings(lRes.data ?? []);
      setBuyers(bRes.data ?? []);
      setRequests(rRes.data ?? []);
      setKpis(kRes.data);
    } catch {
      setError('Failed to load dashboard data. Check your network and Supabase configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { listings, buyers, requests, kpis, loading, error, refetch: fetchAll };
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [filterScope, setFilterScope] = useState('all'); // 'all' | 'real' | 'demo'
  const { listings, buyers, requests, kpis, loading, error, refetch } = useDbData();

  // Decide what to display: DB data if available, else sample data
  const displayListings  = listings  ?? sampleListings;
  const displayBuyers    = buyers    ?? sampleBuyers;
  const displayRequests  = requests  ?? sampleMatches;
  const isLiveData       = isConfigured && listings !== null;

  const liveKpis = kpis ?? {
    totalListings:  staticStats.totalListings,
    totalBuyers:    sampleBuyers.length,
    totalRequests:  sampleMatches.length,
    totalQuantityTonnes: staticStats.tonsRedirected,
    tonsRedirected: staticStats.tonsRedirected,
    real: { listings: 0, quantityTonnes: 0, buyers: 0, requests: 0 },
    demo: { listings: staticStats.totalListings, quantityTonnes: staticStats.tonsRedirected, buyers: sampleBuyers.length, requests: sampleMatches.length },
  };

  // Grouped collection opportunities (Feature 6)
  const groupings = useMemo(() => {
    return findCollectionGroupings(displayListings, displayBuyers);
  }, [displayListings, displayBuyers]);

  // Filtered views based on user selection (Feature 5)
  const filteredListings = useMemo(() => {
    if (!displayListings) return [];
    if (filterScope === 'real') return displayListings.filter((l) => !l.is_demo && !l.isDemo);
    if (filterScope === 'demo') return displayListings.filter((l) => !!(l.is_demo || l.isDemo));
    return displayListings;
  }, [displayListings, filterScope]);

  const filteredBuyers = useMemo(() => {
    if (!displayBuyers) return [];
    if (filterScope === 'real') return displayBuyers.filter((b) => !b.is_demo && !b.isDemo);
    if (filterScope === 'demo') return displayBuyers.filter((b) => !!(b.is_demo || b.isDemo));
    return displayBuyers;
  }, [displayBuyers, filterScope]);

  const filteredRequests = useMemo(() => {
    if (!displayRequests) return [];
    if (filterScope === 'real') return displayRequests.filter((r) => !r.is_demo && !r.isDemo && !r.demo_buyer_ref);
    if (filterScope === 'demo') return displayRequests.filter((r) => !!(r.is_demo || r.isDemo || r.demo_buyer_ref));
    return displayRequests;
  }, [displayRequests, filterScope]);

  const tabs = [
    { id: 'overview',    label: '📊 Overview' },
    { id: 'listings',    label: `🌾 Listings (${filteredListings.length})` },
    { id: 'requests',    label: `📬 Requests (${filteredRequests.length})` },
    { id: 'buyers',      label: `🏭 Buyers (${filteredBuyers.length})` },
    { id: 'collections', label: `📦 Grouped Collections (${groupings.length})` },
  ];

  return (
    <main className="dashboard-page">
      {/* Hero */}
      <div className="page-hero">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <span className="section-eyebrow" style={{ color: 'var(--color-mint)', background: 'rgba(82,183,136,0.15)', display: 'inline-block' }}>
            Control Centre
          </span>
          <h1 className="display-lg text-white mt-md">Dashboard</h1>
          <p className="body-lg mt-md" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {isLiveData
              ? 'Live data from Supabase — all submitted listings, buyers and requests.'
              : 'Sample demonstration data shown — connect Supabase for live records.'}
          </p>
        </div>
      </div>

      <div className="container section-sm">

        {/* ── DB setup or error ── */}
        {!isConfigured && <DbSetupBanner />}
        {error && <DbErrorAlert message={error} onRetry={refetch} />}

        {/* ── Data source indicator ── */}
        <div className="dashboard-source-bar mb-xl">
          <div className="flex items-center gap-sm">
            <span className={`db-dot-sm ${isLiveData ? 'db-dot-sm--live' : 'db-dot-sm--demo'}`} />
            <span className="body-sm font-bold">
              {isLiveData ? 'Live database' : 'Sample / demo data'}
            </span>
            {isLiveData && (
              <span className="body-sm text-muted">— includes demo seed rows (is_demo = true)</span>
            )}
          </div>
          <div className="flex items-center gap-md">
            {isLiveData && !loading && (
              <button onClick={refetch} className="btn btn-outline btn-sm">
                ↻ Refresh
              </button>
            )}
            {loading && <LoadingSpinner label="Loading…" />}
          </div>
        </div>

        {/* ── Feature 5: Real vs Sample Data Activity Distinction ── */}
        <div className="activity-banner card mb-lg">
          <div className="flex justify-between items-center flex-wrap gap-md">
            <div className="flex items-center gap-md flex-wrap">
              <span className="badge badge-green" style={{ fontSize: '0.8125rem', padding: '6px 12px' }}>
                ● Real Activity: {liveKpis.real?.listings ?? 0} listings ({liveKpis.real?.quantityTonnes ?? 0}t) · {liveKpis.real?.buyers ?? 0} buyers · {liveKpis.real?.requests ?? 0} requests
              </span>
              <span className="badge badge-warm" style={{ fontSize: '0.8125rem', padding: '6px 12px' }}>
                ⚠️ Sample Seed Data: {liveKpis.demo?.listings ?? 0} listings ({liveKpis.demo?.quantityTonnes ?? 0}t) · {liveKpis.demo?.buyers ?? 0} buyers · {liveKpis.demo?.requests ?? 0} requests
              </span>
            </div>
            <div className="flex items-center gap-xs">
              <span className="body-xs text-muted font-bold" style={{ marginRight: '4px' }}>Filter View:</span>
              <button
                type="button"
                className={`btn btn-xs ${filterScope === 'all' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterScope('all')}
              >
                All Records
              </button>
              <button
                type="button"
                className={`btn btn-xs ${filterScope === 'real' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterScope('real')}
              >
                Real Only
              </button>
              <button
                type="button"
                className={`btn btn-xs ${filterScope === 'demo' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterScope('demo')}
              >
                Sample Only
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="dashboard-kpis animate-fadeUp">
          <div className="kpi-card kpi-card--green">
            <div className="kpi-icon">🌾</div>
            <div className="kpi-value">{loading ? '—' : liveKpis.totalListings}</div>
            <div className="kpi-label">Total Listings</div>
            <div className="kpi-breakdown">
              {liveKpis.real?.listings ?? 0} real · {liveKpis.demo?.listings ?? 0} sample
            </div>
            <Link to="/farmer" className="kpi-action">Add listing →</Link>
          </div>
          <div className="kpi-card kpi-card--blue animate-fadeUp delay-1">
            <div className="kpi-icon">🏭</div>
            <div className="kpi-value">{loading ? '—' : liveKpis.totalBuyers}</div>
            <div className="kpi-label">Registered Buyers</div>
            <div className="kpi-breakdown">
              {liveKpis.real?.buyers ?? 0} real · {liveKpis.demo?.buyers ?? 0} sample
            </div>
            <Link to="/buyer" className="kpi-action">Register demand →</Link>
          </div>
          <div className="kpi-card kpi-card--tan animate-fadeUp delay-2">
            <div className="kpi-icon">📬</div>
            <div className="kpi-value">{loading ? '—' : liveKpis.totalRequests}</div>
            <div className="kpi-label">Contact Requests</div>
            <div className="kpi-breakdown">
              {liveKpis.real?.requests ?? 0} real · {liveKpis.demo?.requests ?? 0} sample
            </div>
            <Link to="/matches" className="kpi-action">Browse matches →</Link>
          </div>
          <div className="kpi-card kpi-card--forest animate-fadeUp delay-3">
            <div className="kpi-icon">♻️</div>
            <div className="kpi-value">{loading ? '—' : `${liveKpis.totalQuantityTonnes ?? liveKpis.tonsRedirected}t`}</div>
            <div className="kpi-label">Total Volume Listed</div>
            <div className="kpi-breakdown">
              {liveKpis.real?.quantityTonnes ?? 0}t real · {liveKpis.demo?.quantityTonnes ?? 0}t sample
            </div>
            <span className="kpi-action" style={{ cursor: 'default' }}>Matched: {liveKpis.tonsRedirected}t</span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="dashboard-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`dashboard-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="dashboard-content animate-fadeIn">

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="dashboard-overview">
              <div className="overview-grid">
                {/* Recent listings */}
                <div className="card dashboard-panel">
                  <div className="panel-header">
                    <h2 className="heading-lg">Recent Listings</h2>
                    <Link to="/farmer" className="btn btn-primary btn-sm">+ New</Link>
                  </div>
                  <div className="table-wrapper mt-md">
                    <table>
                      <thead>
                        <tr>
                          <th>Farmer</th>
                          <th>Type</th>
                          <th>Qty (t)</th>
                          <th>Status</th>
                          {isLiveData && <th>Source</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {displayListings.slice(0, 5).map((l) => (
                          <tr key={l.id}>
                            <td>
                              <p className="font-bold">{l.farmer_name ?? l.farmerName}</p>
                              <p className="body-sm text-muted">{l.location}</p>
                            </td>
                            <td>{l.residue_type ?? l.residueType}</td>
                            <td><strong>{l.quantity_tonnes ?? l.quantity}</strong></td>
                            <td>
                              <span className={`badge ${STATUS_BADGE[l.status] ?? 'badge-muted'}`}>
                                {l.status}
                              </span>
                            </td>
                            {isLiveData && (
                              <td>
                                <span className={`badge ${l.is_demo ? 'badge-warm' : 'badge-green'}`}>
                                  {l.is_demo ? 'Demo seed' : 'Real'}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent requests / matches */}
                <div className="card dashboard-panel">
                  <div className="panel-header">
                    <h2 className="heading-lg">{isLiveData ? 'Recent Requests' : 'Recent Matches'}</h2>
                    <Link to="/matches" className="btn btn-outline btn-sm">View All</Link>
                  </div>
                  <div className="match-list mt-md">
                    {isLiveData
                      ? (requests ?? []).slice(0, 4).map((r) => (
                          <div key={r.id} className="match-row">
                            <div className={`match-score-ring match-score-medium`} style={{ width: '48px', height: '48px', fontSize: '0.75rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {r.request_type === 'pickup' ? '🚛' : r.request_type === 'quote' ? '💰' : '📨'}
                            </div>
                            <div className="flex-1" style={{ minWidth: 0 }}>
                              <p className="heading-sm">{r.request_type} request</p>
                              <p className="body-sm text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {r.demo_buyer_ref ? `→ Sample buyer (${r.demo_buyer_ref})` : '→ DB buyer'}
                                {r.requester_name ? ` · From: ${r.requester_name}` : ''}
                              </p>
                              <p className="body-sm text-muted">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                            </div>
                            <span className={`badge ${STATUS_BADGE[`${r.status}-req`] ?? STATUS_BADGE[r.status] ?? 'badge-muted'}`} style={{ flexShrink: 0 }}>
                              {r.status}
                            </span>
                          </div>
                        ))
                      : sampleMatches.map((m) => {
                          const listing = sampleListings.find((l) => l.id === m.listingId);
                          const buyer   = sampleBuyers.find((b) => b.id === m.buyerId);
                          return (
                            <div key={m.id} className="match-row">
                              <div className={`match-score-ring ${m.matchScore >= 85 ? 'match-score-high' : 'match-score-medium'}`} style={{ width: '48px', height: '48px', fontSize: '0.875rem', flexShrink: 0 }}>
                                {m.matchScore}%
                              </div>
                              <div className="flex-1" style={{ minWidth: 0 }}>
                                <p className="heading-sm">{listing?.residueType} → {buyer?.orgName}</p>
                                <p className="body-sm text-muted">{m.notes}</p>
                              </div>
                              <span className={`badge ${STATUS_BADGE[m.status] ?? 'badge-muted'}`} style={{ flexShrink: 0 }}>
                                {m.status}
                              </span>
                            </div>
                          );
                        })
                    }
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="dashboard-quick-actions mt-xl">
                <h2 className="heading-lg mb-lg">Quick Actions</h2>
                <div className="quick-action-grid">
                  <Link to="/farmer" className="quick-action-card">
                    <span className="quick-action-icon">🌾</span>
                    <h4 className="heading-sm">List Residue</h4>
                    <p className="body-sm text-muted">Post a new crop residue listing</p>
                  </Link>
                  <Link to="/buyer" className="quick-action-card">
                    <span className="quick-action-icon">🏭</span>
                    <h4 className="heading-sm">Register Demand</h4>
                    <p className="body-sm text-muted">Add your residue requirements</p>
                  </Link>
                  <Link to="/matches" className="quick-action-card">
                    <span className="quick-action-icon">🔍</span>
                    <h4 className="heading-sm">Browse Matches</h4>
                    <p className="body-sm text-muted">See all compatible pairings</p>
                  </Link>
                  <Link to={`/match-details/${sampleBuyers[0].id}?listing=${sampleListings[0].id}#contact`} className="quick-action-card">
                    <span className="quick-action-icon">📬</span>
                    <h4 className="heading-sm">Send Request</h4>
                    <p className="body-sm text-muted">Contact a matched buyer</p>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Listings tab */}
          {activeTab === 'listings' && (
            <div className="card dashboard-panel animate-fadeIn">
              <div className="panel-header">
                <h2 className="heading-lg">
                  {isLiveData ? 'Farmer Listings (Live DB)' : 'Sample Listings'}
                  <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{filteredListings.length}</span>
                </h2>
                <div className="flex items-center gap-sm">
                  <span className="body-xs text-muted">Showing {filterScope === 'all' ? 'All' : filterScope === 'real' ? 'Real' : 'Sample'}</span>
                  <Link to="/farmer" className="btn btn-primary btn-sm">+ New Listing</Link>
                </div>
              </div>
              <div className="table-wrapper mt-md">
                <table>
                  <thead>
                    <tr>
                      <th>Source Type</th>
                      <th>Farmer</th>
                      <th>Residue Type</th>
                      <th>Qty (tonnes)</th>
                      <th>Location</th>
                      <th>Available From</th>
                      <th>Pickup</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredListings.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <span className={`badge ${l.is_demo || l.isDemo ? 'badge-warm' : 'badge-green'}`}>
                            {l.is_demo || l.isDemo ? '⚠️ Sample Seed' : '● Real Record'}
                          </span>
                        </td>
                        <td>
                          <p className="font-bold">{l.farmer_name ?? l.farmerName}</p>
                          <p className="body-sm text-muted">{l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : l.postedDate}</p>
                        </td>
                        <td>{l.residue_type ?? l.residueType}</td>
                        <td><strong>{l.quantity_tonnes ?? l.quantity}</strong></td>
                        <td>{l.location}{l.state ? `, ${l.state}` : ''}</td>
                        <td>{l.availability_date ?? l.availabilityDate}</td>
                        <td className="body-sm">{l.pickup_preference ?? l.pickupPreference}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[l.status] ?? 'badge-muted'}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Requests tab */}
          {activeTab === 'requests' && (
            <div className="card dashboard-panel animate-fadeIn">
              <div className="panel-header">
                <h2 className="heading-lg">
                  {isLiveData ? 'Contact Requests (Live DB)' : 'Sample Matches'}
                  <span className="badge badge-muted" style={{ marginLeft: '8px' }}>
                    {filteredRequests.length}
                  </span>
                </h2>
                <div className="flex items-center gap-sm">
                  <span className="body-xs text-muted">Showing {filterScope === 'all' ? 'All' : filterScope === 'real' ? 'Real' : 'Sample'}</span>
                  <Link to="/matches" className="btn btn-outline btn-sm">Browse Matches</Link>
                </div>
              </div>
              {!isLiveData && (
                <p className="body-sm text-muted mt-sm mb-md">
                  Showing sample match data. Connect Supabase to see real contact requests submitted via the Match Details page.
                </p>
              )}
              {isLiveData && (filteredRequests.length === 0) && (
                <div className="matches-empty" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
                  <p className="body-lg text-muted">
                    {filterScope === 'all'
                      ? 'No contact requests yet. Go to a match and send a pickup or contact request.'
                      : `No ${filterScope} contact requests match the selected view.`}
                  </p>
                  <Link to="/matches" className="btn btn-primary mt-md">Browse Matches</Link>
                </div>
              )}
              {isLiveData && filteredRequests.length > 0 && (
                <div className="table-wrapper mt-md">
                  <table>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Type</th>
                        <th>From</th>
                        <th>Buyer / Target</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <span className={`badge ${r.is_demo || r.demo_buyer_ref ? 'badge-warm' : 'badge-green'}`}>
                              {r.is_demo || r.demo_buyer_ref ? '⚠️ Sample Seed' : '● Real Record'}
                            </span>
                          </td>
                          <td><span className="badge badge-blue">{r.request_type}</span></td>
                          <td>
                            <p className="font-bold">{r.requester_name ?? '(anonymous)'}</p>
                            {r.requester_email && <p className="body-sm text-muted">{r.requester_email}</p>}
                          </td>
                          <td>
                            {r.demo_buyer_ref
                              ? <><p className="font-bold">Sample buyer ({r.demo_buyer_ref})</p><span className="badge badge-warm">Demo</span></>
                              : <p className="font-bold">{r.buyer_requirements?.org_name ?? '—'}</p>}
                          </td>
                          <td>
                            <p className="body-sm" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.message}
                            </p>
                          </td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-muted'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="body-sm text-muted">
                            {new Date(r.created_at).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!isLiveData && (
                <div className="table-wrapper mt-md">
                  <table>
                    <thead>
                      <tr><th>Match</th><th>Score</th><th>Notes</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((m) => {
                        const listing = sampleListings.find((l) => l.id === m.listingId);
                        const buyer   = sampleBuyers.find((b) => b.id === m.buyerId);
                        return (
                          <tr key={m.id}>
                            <td>
                              <p className="font-bold">{listing?.residueType} → {buyer?.orgName}</p>
                              <p className="body-sm text-muted">{listing?.location}</p>
                            </td>
                            <td><span className="badge badge-green">{m.matchScore}%</span></td>
                            <td><p className="body-sm">{m.notes}</p></td>
                            <td><span className={`badge ${STATUS_BADGE[m.status] ?? 'badge-muted'}`}>{m.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Buyers tab */}
          {activeTab === 'buyers' && (
            <div className="card dashboard-panel animate-fadeIn">
              <div className="panel-header">
                <h2 className="heading-lg">
                  {isLiveData ? 'Buyer Requirements (Live DB)' : 'Sample Buyers'}
                  <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{filteredBuyers.length}</span>
                </h2>
                <Link to="/buyer" className="btn btn-warm btn-sm">+ Register Buyer</Link>
              </div>
              <div className="table-wrapper mt-md">
                <table>
                  <thead>
                    <tr>
                      <th>Source Type</th>
                      <th>Organisation</th>
                      <th>Location</th>
                      <th>Intended Use</th>
                      <th>Req. Qty (t)</th>
                      <th>Max Intake (t)</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuyers.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <span className={`badge ${b.is_demo || b.isDemo ? 'badge-warm' : 'badge-green'}`}>
                            {b.is_demo || b.isDemo ? '⚠️ Sample Seed' : '● Real Record'}
                          </span>
                        </td>
                        <td>
                          <p className="font-bold">{b.org_name ?? b.orgName}</p>
                          <div className="tag-list mt-sm" style={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
                            {((b.accepted_types || b.acceptedTypes) ?? []).slice(0, 2).map((t) => (
                              <span key={t} className="badge badge-green">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td>{b.location}{b.state ? `, ${b.state}` : ''}</td>
                        <td>{b.intended_use ?? b.intendedUse}</td>
                        <td>{b.required_quantity_tonnes ?? b.requiredQuantity}</td>
                        <td>{b.max_intake_tonnes ?? b.maxIntake ?? '—'}</td>
                        <td>
                          <span className={`badge ${(b.availability_status === 'yes' || b.available) ? 'badge-green' : 'badge-muted'}`}>
                            {(b.availability_status === 'yes' || b.available) ? 'Active' : 'On Hold'}
                          </span>
                        </td>
                        <td>
                          <Link to={`/match-details/${b.id}`} className="btn btn-outline btn-sm">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grouped Collections Tab (Feature 6) */}
          {activeTab === 'collections' && (
            <div className="card dashboard-panel animate-fadeIn">
              <div className="panel-header">
                <div>
                  <h2 className="heading-lg">
                    Suggested Collection Opportunities
                    <span className="badge badge-warm" style={{ marginLeft: '8px' }}>{groupings.length} Opportunities</span>
                  </h2>
                  <p className="body-sm text-muted mt-xs">
                    Consolidating compatible nearby farmer lots to meet commercial batch volume requirements.
                  </p>
                </div>
                <Link to="/matches" className="btn btn-primary btn-sm">Explore Matches</Link>
              </div>

              <div className="collection-grid mt-lg">
                {groupings.map((grp) => (
                  <div key={grp.id} className="collection-item card">
                    <div className="flex justify-between items-start gap-sm">
                      <div>
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                          🌾 {grp.residueType}
                        </span>
                        <h4 className="heading-sm mt-xs">📍 {grp.clusterLocation}</h4>
                      </div>
                      <div className="text-right">
                        <span className="display-sm text-forest" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                          {grp.totalQuantityTonnes}t
                        </span>
                        <p className="body-xs text-muted">({grp.farmerCount} farmers)</p>
                      </div>
                    </div>

                    <div className="collection-target mt-sm">
                      <span className="body-xs text-muted">Target Buyer Demand:</span>
                      <p className="font-bold">{grp.targetBuyer.orgName}</p>
                      <div className="flex items-center gap-xs mt-xs flex-wrap">
                        <span className="badge badge-muted" style={{ fontSize: '0.6875rem' }}>
                          Target: {grp.targetBuyer.requiredQuantity}t ({grp.fulfillmentPct}%)
                        </span>
                        {grp.indicativeLotValue && (
                          <span className="badge badge-green" style={{ fontSize: '0.6875rem' }}>
                            Est. Value: ₹{grp.indicativeLotValue.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="collection-farmers mt-sm">
                      <span className="body-xs text-muted" style={{ display: 'block', marginBottom: '4px' }}>
                        Consolidated Farmer Listings:
                      </span>
                      <div className="flex flex-col gap-xs">
                        {grp.participatingListings.map((p) => (
                          <div key={p.id} className="flex justify-between items-center body-xs" style={{ background: '#f8faf9', padding: '4px 8px', borderRadius: '4px' }}>
                            <span>{p.farmerName}</span>
                            <strong>{p.quantity} tonnes</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-sm">
                      <p className="body-xs text-muted" style={{ fontStyle: 'italic', lineHeight: 1.4 }}>
                        ℹ️ {grp.disclaimer}
                      </p>
                    </div>

                    <Link
                      to={`/match-details/${grp.targetBuyer.id}?listing=${grp.participatingListings[0].id}`}
                      className="btn btn-outline btn-sm w-full mt-sm"
                    >
                      View Buyer Details →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
