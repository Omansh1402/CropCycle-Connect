import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchFarmerListings,
  fetchBuyerRequirements,
  fetchContactRequests,
  fetchDashboardStats,
  updateListingStatus,
  updateContactRequestStatus,
  formatDbError,
} from '../lib/db';
import { isConfigured } from '../lib/supabase';
import { sampleListings, sampleBuyers, sampleMatches, dashboardStats as staticStats } from '../data/sampleData';
import { DbSetupBanner, DbErrorAlert, LoadingSpinner } from '../components/DbStatus';
import { findCollectionGroupings } from '../lib/matchingEngine';
import { useTranslation } from '../lib/i18n';
import SplitText from '../components/reactbits/SplitText';
import FadeContent from '../components/reactbits/FadeContent';
import CountUp from '../components/reactbits/CountUp';
import './Dashboard.css';

const STATUS_BADGE = {
  active:   'badge-green',
  pending:  'badge-warm',
  matched:  'badge-blue',
  closed:   'badge-muted',
  'pending-req': 'badge-warm',
  accepted:      'badge-green',
  rejected:      'badge-muted',
  completed:     'badge-blue',
  Active:   'badge-green',
  Pending:  'badge-warm',
  Matched:  'badge-blue',
  Accepted: 'badge-green',
  'Pending Response': 'badge-warm',
};

function useDbData() {
  const [listings, setListings] = useState(null);
  const [buyers,   setBuyers]   = useState(null);
  const [requests, setRequests] = useState(null);
  const [kpis,     setKpis]     = useState(null);
  const [loading,  setLoading]  = useState(isConfigured);
  const [error,    setError]    = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;

    let isMounted = true;

    Promise.all([
      fetchFarmerListings(),
      fetchBuyerRequirements(),
      fetchContactRequests(),
      fetchDashboardStats(),
    ])
      .then(([lRes, bRes, rRes, kRes]) => {
        if (!isMounted) return;
        const firstError = [lRes, bRes, rRes, kRes].find((r) => r.error);
        if (firstError) {
          setError(formatDbError(firstError.error));
        } else {
          setListings(lRes.data ?? []);
          setBuyers(bRes.data ?? []);
          setRequests(rRes.data ?? []);
          setKpis(kRes.data);
          setError(null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Failed to load dashboard data. Check your network and Supabase configuration.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshToken]);

  return { listings, buyers, requests, kpis, loading, error, refetch };
}

export default function Dashboard() {
  const { t, tStatus, tResidue, tDelivery, tIndustry, tPurpose } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [filterScope, setFilterScope] = useState('all'); // 'all' | 'real' | 'demo'
  const { listings, buyers, requests, kpis, loading, error, refetch } = useDbData();

  // Workflow action states
  const [actionState, setActionState] = useState({ id: null, loading: false });
  const [securityNotice, setSecurityNotice] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Handle contact request status updates
  const handleUpdateContactRequest = async (id, newStatus, isDemo) => {
    if (isDemo || (typeof id === 'string' && (id.startsWith('REQ') || id.startsWith('M0')))) {
      setSecurityNotice({
        title: 'Demo Record Read-Only',
        message: 'Sample contact requests are simulated reference data and cannot be mutated.',
        technicalDetails: 'Demo records reside in local memory in data/sampleData.js rather than Supabase PostgreSQL.',
        resolution: 'To test live updates, submit a real contact request via the Match Details page with Supabase connected.',
      });
      return;
    }

    setActionState({ id, loading: true });
    setActionSuccess(null);
    setActionError(null);

    try {
      const { data, error: updateErr } = await updateContactRequestStatus(id, newStatus);
      if (updateErr) {
        if (
          updateErr.code === '42501' ||
          updateErr.message?.includes('violates row-level security') ||
          updateErr.message?.includes('permission denied')
        ) {
          setSecurityNotice({
            title: 'Database Security Restriction (Row Level Security)',
            message: 'Status update was rejected by Supabase Row Level Security.',
            technicalDetails: 'Postgres Error 42501: No public UPDATE policy exists for table "contact_requests". Public anonymous clients cannot mutate records.',
            resolution:
              'Secure status updates require authentication (e.g. Supabase Auth with admin role), a signed RPC function, or a backend Edge Function with service_role privileges. The frontend will not bypass security or falsely claim success.',
          });
        } else {
          setActionError(formatDbError(updateErr));
        }
      } else if (data) {
        setActionSuccess(`Contact request #${id.slice(0, 8)} status confirmed as "${newStatus}" by database.`);
        refetch();
      } else {
        setSecurityNotice({
          title: 'Database Security Restriction (0 Rows Modified)',
          message: 'The database did not confirm this update. Row Level Security prevented modification.',
          technicalDetails: 'Under Supabase RLS, an UPDATE query on a row without an UPDATE policy affects 0 rows and returns null.',
          resolution: 'Configure Supabase authentication or an authorized Edge Function to allow administrative status changes.',
        });
      }
    } catch (err) {
      setActionError('Failed to update request: ' + (err.message || 'Network error'));
    } finally {
      setActionState({ id: null, loading: false });
    }
  };

  // Handle farmer listing status updates
  const handleUpdateListingStatus = async (id, newStatus, isDemo) => {
    if (isDemo || (typeof id === 'string' && (id.startsWith('L0') || id.length < 10))) {
      setSecurityNotice({
        title: 'Demo Record Read-Only',
        message: 'Sample crop residue listings are simulated seed records and cannot be mutated.',
        technicalDetails: 'Demo listings reside in data/sampleData.js.',
        resolution: 'Submit a live farmer listing on the /farmer page to create a modifiable Supabase database record.',
      });
      return;
    }

    setActionState({ id, loading: true });
    setActionSuccess(null);
    setActionError(null);

    try {
      const { data, error: updateErr } = await updateListingStatus(id, newStatus);
      if (updateErr) {
        if (
          updateErr.code === '42501' ||
          updateErr.message?.includes('violates row-level security') ||
          updateErr.message?.includes('permission denied')
        ) {
          setSecurityNotice({
            title: 'Database Security Restriction (Row Level Security)',
            message: 'Status update was rejected by Supabase Row Level Security.',
            technicalDetails: 'Postgres Error 42501: No public UPDATE policy exists for table "farmer_listings". Public anonymous clients cannot mutate records.',
            resolution:
              'Marking listings as matched requires authenticated administrative privileges, a signed RPC function, or an Edge Function. Unrestricted public write policies are disabled to protect data integrity.',
          });
        } else {
          setActionError(formatDbError(updateErr));
        }
      } else if (data) {
        setActionSuccess(`Listing #${id.slice(0, 8)} status confirmed as "${newStatus}" by database.`);
        refetch();
      } else {
        setSecurityNotice({
          title: 'Database Security Restriction (0 Rows Modified)',
          message: 'The database did not confirm this update. Row Level Security prevented modification.',
          technicalDetails: 'Under Supabase RLS, an UPDATE query on a row without an UPDATE policy affects 0 rows and returns null.',
          resolution: 'Configure Supabase authentication or an authorized Edge Function to allow administrative status changes.',
        });
      }
    } catch (err) {
      setActionError('Failed to update listing: ' + (err.message || 'Network error'));
    } finally {
      setActionState({ id: null, loading: false });
    }
  };

  // Decide what to display
  const displayListings  = listings  ?? sampleListings;
  const displayBuyers    = buyers    ?? sampleBuyers;
  const displayRequests  = requests  ?? sampleMatches;
  const isLiveData       = isConfigured && listings !== null;

  const liveKpis = useMemo(() => {
    return kpis ?? {
      totalListings:  staticStats.totalListings,
      totalBuyers:    sampleBuyers.length,
      totalRequests:  sampleMatches.length,
      totalQuantityTonnes: staticStats.tonsRedirected,
      tonsRedirected: staticStats.tonsRedirected,
      real: { listings: 0, quantityTonnes: 0, buyers: 0, requests: 0 },
      demo: { listings: staticStats.totalListings, quantityTonnes: staticStats.tonsRedirected, buyers: sampleBuyers.length, requests: sampleMatches.length },
    };
  }, [kpis]);

  const getBuyerDisplayName = (r) => {
    if (r.buyer_requirements?.org_name) {
      return r.buyer_requirements.org_name;
    }
    if (r.buyer_id && Array.isArray(buyers)) {
      const found = buyers.find((b) => b.id === r.buyer_id);
      if (found?.org_name || found?.orgName) return found.org_name || found.orgName;
    }
    if (r.demo_buyer_ref) {
      const sample = sampleBuyers.find((b) => b.id === r.demo_buyer_ref);
      if (sample?.orgName) return sample.orgName;
      return `Sample Buyer (${r.demo_buyer_ref})`;
    }
    return 'Registered Buyer';
  };

  const activeKpis = useMemo(() => {
    if (filterScope === 'real') {
      return {
        listings: liveKpis.real?.listings ?? 0,
        listingsBreakdown: 'Live entries in PostgreSQL database',
        buyers: liveKpis.real?.buyers ?? 0,
        buyersBreakdown: 'Verified industrial buyer entities',
        requests: liveKpis.real?.requests ?? 0,
        requestsBreakdown: 'Active sourcing inquiries',
        volume: `${liveKpis.real?.quantityTonnes ?? 0}t`,
        volumeBreakdown: 'Active harvest volume listed',
      };
    }
    if (filterScope === 'demo') {
      return {
        listings: liveKpis.demo?.listings ?? 0,
        listingsBreakdown: 'Demonstration seed lots',
        buyers: liveKpis.demo?.buyers ?? 0,
        buyersBreakdown: 'Reference industrial accounts',
        requests: liveKpis.demo?.requests ?? 0,
        requestsBreakdown: 'Simulated haulage requests',
        volume: `${liveKpis.demo?.quantityTonnes ?? 0}t`,
        volumeBreakdown: 'Demonstration baseline capacity',
      };
    }
    return {
      listings: liveKpis.totalListings,
      listingsBreakdown: `${liveKpis.real?.listings ?? 0} live · ${liveKpis.demo?.listings ?? 0} reference`,
      buyers: liveKpis.totalBuyers,
      buyersBreakdown: `${liveKpis.real?.buyers ?? 0} live · ${liveKpis.demo?.buyers ?? 0} reference`,
      requests: liveKpis.totalRequests,
      requestsBreakdown: `${liveKpis.real?.requests ?? 0} live · ${liveKpis.demo?.requests ?? 0} reference`,
      volume: `${liveKpis.totalQuantityTonnes ?? liveKpis.tonsRedirected}t`,
      volumeBreakdown: `${liveKpis.real?.quantityTonnes ?? 0}t live · ${liveKpis.demo?.quantityTonnes ?? 0}t reference`,
    };
  }, [liveKpis, filterScope]);

  const groupings = useMemo(() => {
    return findCollectionGroupings(displayListings, displayBuyers);
  }, [displayListings, displayBuyers]);

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
    { id: 'overview',    label: t('networkOverviewTab') },
    { id: 'listings',    label: `${t('supplyListingsTab')} (${filteredListings.length})` },
    { id: 'requests',    label: `${t('sourcingInquiriesTab')} (${filteredRequests.length})` },
    { id: 'buyers',      label: `${t('industrialBuyersTab')} (${filteredBuyers.length})` },
    { id: 'collections', label: `${t('clusterFreightTab')} (${groupings.length})` },
  ];

  return (
    <main className="dashboard-page">
      <header className="page-header">
        <div className="container">
          <div className="page-header__inner">
            <span className="section-eyebrow">{t('enterpriseConsole')}</span>
            <SplitText text={t('operationsDashboard')} tag="h1" className="display-lg" delay={0.03} />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '640px' }}>
              {isLiveData
                ? t('connectedSupabaseDesc')
                : t('demoEnvironmentDesc')}
            </p>
          </div>
        </div>
      </header>

      <div className="container section-sm">
        {!isConfigured && <DbSetupBanner />}
        {error && <DbErrorAlert message={error} onRetry={refetch} />}

        {/* Source Status Bar */}
        <div className="dashboard-source-bar mb-lg">
          <div className="flex items-center gap-sm">
            <span className={`db-dot-sm ${isLiveData ? 'db-dot-sm--live' : 'db-dot-sm--demo'}`} />
            <span className="body-sm font-semibold">
              {isLiveData ? t('activePostgresConnection') : t('demoCatalogActive')}
            </span>
            {isLiveData && (
              <span className="body-sm text-muted">{t('realtimeSyncActive')}</span>
            )}
          </div>
          <div className="flex items-center gap-md">
            {isLiveData && !loading && (
              <button onClick={refetch} className="btn btn-outline btn-sm">
                {t('refreshRecordsBtn')}
              </button>
            )}
            {loading && <LoadingSpinner label={t('queryingDatabaseSpinner')} />}
          </div>
        </div>

        {/* Scope Filter Bar */}
        <div className="activity-banner card mb-lg">
          <div className="flex justify-between items-center flex-wrap gap-md">
            <div className="flex items-center gap-sm flex-wrap">
              <span className="badge badge-green">
                Live Data: {liveKpis.real?.listings ?? 0} lots ({liveKpis.real?.quantityTonnes ?? 0}t) · {liveKpis.real?.buyers ?? 0} buyers · {liveKpis.real?.requests ?? 0} inquiries
              </span>
              <span className="badge badge-muted">
                Reference Data: {liveKpis.demo?.listings ?? 0} lots ({liveKpis.demo?.quantityTonnes ?? 0}t) · {liveKpis.demo?.buyers ?? 0} buyers
              </span>
            </div>
            <div className="scope-btn-group">
              <span className="label" style={{ marginRight: '4px' }}>{t('scopeLabel')}</span>
              <button
                type="button"
                className={`scope-btn ${filterScope === 'all' ? 'active' : ''}`}
                onClick={() => setFilterScope('all')}
              >
                {t('allRecordsScope')}
              </button>
              <button
                type="button"
                className={`scope-btn ${filterScope === 'real' ? 'active' : ''}`}
                onClick={() => setFilterScope('real')}
              >
                {t('liveOnlyScope')}
              </button>
              <button
                type="button"
                className={`scope-btn ${filterScope === 'demo' ? 'active' : ''}`}
                onClick={() => setFilterScope('demo')}
              >
                {t('referenceOnlyScope')}
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards Ledger with CountUp */}
        <FadeContent delay={0.1} distance={18} className="stat-grid mb-xl">
          <div className="stat-card">
            <div className="stat-value">
              {loading ? '—' : typeof activeKpis.listings === 'number' ? <CountUp to={activeKpis.listings} duration={1.4} /> : activeKpis.listings}
            </div>
            <div className="label">{t('supplyListingsKpi')}</div>
            <div className="stat-label mt-xs">{activeKpis.listingsBreakdown}</div>
            <Link to="/farmer" className="stat-action-link mt-sm">{t('postListing')} →</Link>
          </div>

          <div className="stat-card">
            <div className="stat-value">
              {loading ? '—' : typeof activeKpis.buyers === 'number' ? <CountUp to={activeKpis.buyers} duration={1.4} /> : activeKpis.buyers}
            </div>
            <div className="label">{t('industrialBuyersKpi')}</div>
            <div className="stat-label mt-xs">{activeKpis.buyersBreakdown}</div>
            <Link to="/buyer" className="stat-action-link mt-sm">{t('registerDemand')} →</Link>
          </div>

          <div className="stat-card">
            <div className="stat-value">
              {loading ? '—' : typeof activeKpis.requests === 'number' ? <CountUp to={activeKpis.requests} duration={1.4} /> : activeKpis.requests}
            </div>
            <div className="label">{t('sourcingInquiriesKpi')}</div>
            <div className="stat-label mt-xs">{activeKpis.requestsBreakdown}</div>
            <Link to="/matches" className="stat-action-link mt-sm">{t('inspectMatches')} →</Link>
          </div>

          <div className="stat-card">
            <div className="stat-value">
              {loading ? '—' : typeof activeKpis.volume === 'number' ? <CountUp to={activeKpis.volume} suffix="t" duration={1.6} /> : activeKpis.volume}
            </div>
            <div className="label">{t('biomassVolumeKpi')}</div>
            <div className="stat-label mt-xs">{activeKpis.volumeBreakdown}</div>
            <span className="stat-label mt-sm" style={{ display: 'block', color: 'var(--color-forest)' }}>
              {t('avoidedBurnLabel')} {typeof liveKpis.tonsRedirected === 'number' ? <CountUp to={liveKpis.tonsRedirected} suffix="t" duration={1.6} /> : `${liveKpis.tonsRedirected}t`}
            </span>
          </div>
        </FadeContent>

        {/* Tab Navigation */}
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

        {/* Success confirmation banner */}
        {actionSuccess && (
          <div className="db-success-banner mb-md flex justify-between items-center">
            <span>{actionSuccess}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setActionSuccess(null)}
            >
              {t('dismissBtn')}
            </button>
          </div>
        )}

        {/* Action error banner */}
        {actionError && (
          <div className="mb-md">
            <DbErrorAlert message={actionError} onRetry={() => setActionError(null)} />
          </div>
        )}

        {/* ── Tab Content ── */}
        <FadeContent delay={0.15} distance={20} className="dashboard-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="dashboard-overview">
              <div className="overview-grid">
                {/* Recent listings */}
                <div className="card dashboard-panel">
                  <div className="panel-header">
                    <h2 className="heading-md">{t('recentSupplyListings')}</h2>
                    <Link to="/farmer" className="btn btn-primary btn-sm">{t('postFarmListing')}</Link>
                  </div>
                  <div className="table-wrapper mt-md">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('colProducer')}</th>
                          <th>{t('residueVariety')}</th>
                          <th>{t('tonnage')}</th>
                          <th>{t('status')}</th>
                          {isLiveData && <th>{t('scopeLabel')}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredListings.length > 0 ? (
                          filteredListings.slice(0, 5).map((l) => (
                            <tr key={l.id}>
                              <td>
                                <div className="font-semibold">{l.farmer_name ?? l.farmerName}</div>
                                <div className="body-sm text-muted">{l.location}</div>
                              </td>
                              <td>{tResidue(l.residue_type ?? l.residueType)}</td>
                              <td><strong>{l.quantity_tonnes ?? l.quantity} {t('tonnes')}</strong></td>
                              <td>
                                <span className={`badge ${STATUS_BADGE[l.status] ?? 'badge-muted'}`}>
                                  {tStatus(l.status)}
                                </span>
                              </td>
                              {isLiveData && (
                                <td>
                                  <span className={`badge ${l.is_demo ? 'badge-muted' : 'badge-green'}`}>
                                    {l.is_demo ? t('referenceRecord') : t('verifiedBadge')}
                                  </span>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={isLiveData ? 5 : 4} className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>
                              {t('emptyListings')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent requests */}
                <div className="card dashboard-panel">
                  <div className="panel-header">
                    <h2 className="heading-md">{isLiveData ? t('recentInquiries') : t('recentMatches')}</h2>
                    <Link to="/matches" className="btn btn-outline btn-sm">{t('inspectCatalog')}</Link>
                  </div>
                  <div className="match-list mt-md">
                    {isLiveData ? (
                      filteredRequests.length > 0 ? (
                        filteredRequests.slice(0, 4).map((r) => (
                          <div key={r.id} className="match-row">
                            <div className="match-row-info">
                              <div className="font-semibold text-forest">
                                {r.request_type ? `${r.request_type.toUpperCase()} ${t('inquiryProtocolLabel')}` : 'Haulage Request'}
                              </div>
                              <div className="body-sm text-muted">
                                Target: {getBuyerDisplayName(r)} · From: {r.requester_name || t('cooperativeLead')}
                              </div>
                              <div className="body-sm text-muted">
                                {new Date(r.created_at).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                            <span className={`badge ${STATUS_BADGE[`${r.status}-req`] ?? STATUS_BADGE[r.status] ?? 'badge-muted'}`}>
                              {tStatus(r.status)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="body-sm text-muted text-center" style={{ padding: 'var(--space-xl)' }}>
                          {t('emptyRequests')}
                        </p>
                      )
                    ) : (
                      filteredRequests.length > 0 ? (
                        filteredRequests.slice(0, 4).map((m) => {
                          const listing = sampleListings.find((l) => l.id === m.listingId);
                          const buyer   = sampleBuyers.find((b) => b.id === m.buyerId);
                          return (
                            <div key={m.id} className="match-row">
                              <div className="match-row-score">
                                {m.matchScore}%
                              </div>
                              <div className="match-row-info">
                                <div className="font-semibold">{tResidue(listing?.residueType)} → {buyer?.orgName}</div>
                                <div className="body-sm text-muted">{m.notes}</div>
                              </div>
                              <span className={`badge ${STATUS_BADGE[m.status] ?? 'badge-muted'}`}>
                                {tStatus(m.status)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="body-sm text-muted text-center" style={{ padding: 'var(--space-xl)' }}>
                          {t('noMatchesFound')}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Quick actions bar */}
              <div className="mt-2xl">
                <h3 className="heading-md mb-md">{t('marketplaceActions')}</h3>
                <div className="quick-action-grid">
                  <Link to="/farmer" className="quick-action-card card">
                    <span className="label">{t('farmSupplyLabel')}</span>
                    <h4 className="heading-sm mt-xs">{t('postResidueListing')}</h4>
                    <p className="body-sm text-muted mt-xs">{t('logHarvestSub')}</p>
                  </Link>

                  <Link to="/buyer" className="quick-action-card card">
                    <span className="label">{t('industrialSourcing')}</span>
                    <h4 className="heading-sm mt-xs">{t('registerDemand')}</h4>
                    <p className="body-sm text-muted mt-xs">{t('defineFeedstockSub')}</p>
                  </Link>

                  <Link to="/matches" className="quick-action-card card">
                    <span className="label">{t('algorithmicIndex')}</span>
                    <h4 className="heading-sm mt-xs">{t('inspectMarketplace')}</h4>
                    <p className="body-sm text-muted mt-xs">{t('evaluateCompatibilitySub')}</p>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Listings Tab */}
          {activeTab === 'listings' && (
            <div className="card dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2 className="heading-md">
                    {t('supplyListingsTab')}
                    <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{filteredListings.length}</span>
                  </h2>
                  <p className="body-sm text-muted mt-xs">
                    {t('listingQualityStandards') || 'Indexed farmer lots ready for industrial dispatch.'}
                  </p>
                </div>
                <Link to="/farmer" className="btn btn-primary btn-sm">{t('postFarmListing')}</Link>
              </div>

              {filteredListings.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="heading-md">{t('emptyListings')}</h3>
                  <p className="body-md text-muted">
                    {t('noMatchesDesc') || 'No listings match the current scope filter. Register a farm listing to populate the directory.'}
                  </p>
                  <div className="empty-state-actions">
                    <Link to="/farmer" className="btn btn-primary">{t('postFarmListing')}</Link>
                    {filterScope !== 'all' && (
                      <button type="button" className="btn btn-outline" onClick={() => setFilterScope('all')}>
                        {t('allRecordsScope')}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="table-wrapper mt-md">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('colClassification')}</th>
                        <th>{t('colProducer')}</th>
                        <th>{t('residueVariety')}</th>
                        <th>{t('colQuantity')}</th>
                        <th>{t('colLocation')}</th>
                        <th>{t('colHarvestWindow')}</th>
                        <th>{t('colLogisticsMode')}</th>
                        <th>{t('status')}</th>
                        <th>{t('colAction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredListings.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <span className={`badge ${l.is_demo || l.isDemo ? 'badge-muted' : 'badge-green'}`}>
                              {l.is_demo || l.isDemo ? t('referenceRecord') : t('verifiedBadge')}
                            </span>
                          </td>
                          <td>
                            <div className="font-semibold">{l.farmer_name ?? l.farmerName}</div>
                            <div className="body-sm text-muted">{l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : l.postedDate}</div>
                          </td>
                          <td>{tResidue(l.residue_type ?? l.residueType)}</td>
                          <td><strong>{l.quantity_tonnes ?? l.quantity} {t('tonnes')}</strong></td>
                          <td>{l.location}{l.state ? `, ${l.state}` : ''}</td>
                          <td>{l.availability_date ?? l.availabilityDate}</td>
                          <td className="body-sm">{tDelivery(l.pickup_preference ?? l.pickupPreference)}</td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[l.status] ?? 'badge-muted'}`}>
                              {tStatus(l.status)}
                            </span>
                          </td>
                          <td>
                            {l.status === 'matched' ? (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                disabled={actionState.loading && actionState.id === l.id}
                                onClick={() => handleUpdateListingStatus(l.id, 'active', l.is_demo || l.isDemo)}
                              >
                                {t('actionReactivate')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={actionState.loading && actionState.id === l.id}
                                onClick={() => handleUpdateListingStatus(l.id, 'matched', l.is_demo || l.isDemo)}
                              >
                                {t('actionMarkMatched')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="card dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2 className="heading-md">
                    {t('sourcingInquiriesTab')}
                    <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{filteredRequests.length}</span>
                  </h2>
                  <p className="body-sm text-muted mt-xs">
                    {t('sourcingRequestsDesc') || 'Recorded communications between farm producers and commercial purchasers.'}
                  </p>
                </div>
                <Link to="/matches" className="btn btn-outline btn-sm">{t('inspectMatches')}</Link>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="heading-md">{t('emptyRequests')}</h3>
                  <p className="body-md text-muted">
                    {t('noRequestsDesc') || 'No requests have been submitted yet. Transmit an inquiry from any Buyer Profile on the Matches page.'}
                  </p>
                  <Link to="/matches" className="btn btn-primary mt-sm">{t('findCompatibleBuyers') || t('inspectMatches')}</Link>
                </div>
              ) : isLiveData ? (
                <div className="table-wrapper mt-md">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('scopeLabel')}</th>
                        <th>{t('inquiryProtocolLabel')}</th>
                        <th>{t('colProducer')}</th>
                        <th>{t('colBuyer')}</th>
                        <th>{t('logisticsSpecsLabel')}</th>
                        <th>{t('status')}</th>
                        <th>{t('colDate')}</th>
                        <th>{t('colAction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <span className={`badge ${r.is_demo || r.demo_buyer_ref ? 'badge-muted' : 'badge-green'}`}>
                              {r.is_demo || r.demo_buyer_ref ? t('referenceRecord') : t('verifiedBadge')}
                            </span>
                          </td>
                          <td><span className="badge badge-blue">{r.request_type}</span></td>
                          <td>
                            <div className="font-semibold">{r.requester_name ?? 'Anonymous Lead'}</div>
                            {r.requester_email && <div className="body-sm text-muted">{r.requester_email}</div>}
                          </td>
                          <td>
                            <div className="font-semibold">{getBuyerDisplayName(r)}</div>
                          </td>
                          <td>
                            <div className="body-sm" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.message}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-muted'}`}>
                              {tStatus(r.status)}
                            </span>
                          </td>
                          <td className="body-sm text-muted">
                            {new Date(r.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td>
                            {r.status === 'pending' ? (
                              <div className="flex gap-xs">
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  disabled={actionState.loading && actionState.id === r.id}
                                  onClick={() => handleUpdateContactRequest(r.id, 'accepted', r.is_demo || !!r.demo_buyer_ref)}
                                >
                                  {t('actionAccept')}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  disabled={actionState.loading && actionState.id === r.id}
                                  onClick={() => handleUpdateContactRequest(r.id, 'rejected', r.is_demo || !!r.demo_buyer_ref)}
                                >
                                  {t('actionReject')}
                                </button>
                              </div>
                            ) : r.status === 'accepted' ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={actionState.loading && actionState.id === r.id}
                                onClick={() => handleUpdateContactRequest(r.id, 'completed', r.is_demo || !!r.demo_buyer_ref)}
                              >
                                {t('actionCompleteHaulage')}
                              </button>
                            ) : (
                              <span className="body-sm text-muted">{t('statusSettled')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="table-wrapper mt-md">
                  <table>
                    <thead>
                      <tr><th>{t('colPairing')}</th><th>{t('matchScore')}</th><th>{t('colNotes')}</th><th>{t('status')}</th></tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((m) => {
                        const listing = sampleListings.find((l) => l.id === m.listingId);
                        const buyer   = sampleBuyers.find((b) => b.id === m.buyerId);
                        return (
                          <tr key={m.id}>
                            <td>
                              <div className="font-semibold">{tResidue(listing?.residueType)} → {buyer?.orgName}</div>
                              <div className="body-sm text-muted">{listing?.location}</div>
                            </td>
                            <td><span className="badge badge-green">{m.matchScore}%</span></td>
                            <td><div className="body-sm">{m.notes}</div></td>
                            <td><span className={`badge ${STATUS_BADGE[m.status] ?? 'badge-muted'}`}>{tStatus(m.status)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Buyers Tab */}
          {activeTab === 'buyers' && (
            <div className="card dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2 className="heading-md">
                    {t('industrialBuyersTab')}
                    <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{filteredBuyers.length}</span>
                  </h2>
                  <p className="body-sm text-muted mt-xs">
                    {t('buyerPortalDesc') || 'Registered enterprise processing entities and commercial feedstock intake facilities.'}
                  </p>
                </div>
                <Link to="/buyer" className="btn btn-primary btn-sm">{t('registerDemand')}</Link>
              </div>

              {filteredBuyers.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="heading-md">{t('emptyBuyers')}</h3>
                  <p className="body-md text-muted">
                    {t('noBuyersDesc') || 'No buyer requirement profiles match the active scope. Register an industrial buyer profile to begin sourcing.'}
                  </p>
                  <Link to="/buyer" className="btn btn-primary mt-sm">{t('registerDemand')}</Link>
                </div>
              ) : (
                <div className="table-wrapper mt-md">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('scopeLabel')}</th>
                        <th>{t('colBuyer')}</th>
                        <th>{t('colLocation')}</th>
                        <th>{t('buyerPurpose')}</th>
                        <th>{t('colQuantity')}</th>
                        <th>{t('colIntake')}</th>
                        <th>{t('status')}</th>
                        <th>{t('colAction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBuyers.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <span className={`badge ${b.is_demo || b.isDemo ? 'badge-muted' : 'badge-green'}`}>
                              {b.is_demo || b.isDemo ? t('referenceRecord') : t('verifiedBadge')}
                            </span>
                          </td>
                          <td>
                            <div className="font-semibold">{b.org_name ?? b.orgName}</div>
                            <div className="tag-list mt-xs">
                              {((b.accepted_types || b.acceptedTypes) ?? []).slice(0, 2).map((tType) => (
                                <span key={tType} className="badge badge-green">{tResidue(tType)}</span>
                              ))}
                            </div>
                          </td>
                          <td>{b.location}{b.state ? `, ${b.state}` : ''}</td>
                          <td>{tPurpose(b.intended_use ?? b.intendedUse)}</td>
                          <td><strong>{b.required_quantity_tonnes ?? b.requiredQuantity} {t('tonnes')}</strong></td>
                          <td>{b.max_intake_tonnes ?? b.maxIntake ?? t('flexible')}</td>
                          <td>
                            <span className={`badge ${(b.availability_status === 'yes' || b.available) ? 'badge-green' : 'badge-muted'}`}>
                              {(b.availability_status === 'yes' || b.available) ? t('active') : t('onHold')}
                            </span>
                          </td>
                          <td>
                            <Link to={`/match-details/${b.id}`} className="btn btn-outline btn-sm">{t('viewDetails')}</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Grouped Collections Tab */}
          {activeTab === 'collections' && (
            <div className="card dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2 className="heading-md">
                    {t('clusterFreightTab')}
                    <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{groupings.length} {t('opportunitiesBadge') || 'Opportunities'}</span>
                  </h2>
                  <p className="body-sm text-muted mt-xs">
                    {t('clusterFreightSub') || 'Multi-farm pooling within a 25 km radius to meet commercial buyer batch volumes.'}
                  </p>
                </div>
                <Link to="/matches" className="btn btn-outline btn-sm">{t('inspectMarketplace')}</Link>
              </div>

              {groupings.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="heading-md">{t('noClusterGroupings') || 'No Cluster Groupings Available'}</h3>
                  <p className="body-md text-muted">
                    {t('clusterGroupingsEmptyDesc') || 'Cluster groupings automatically activate when multiple smallholder farms within 25 km combine to fulfill larger industrial batches (50+ tonnes).'}
                  </p>
                  <Link to="/matches" className="btn btn-primary mt-sm">{t('browseMatchingSupply')}</Link>
                </div>
              ) : (
                <div className="collection-grid mt-lg">
                  {groupings.map((grp) => (
                    <div key={grp.id} className="collection-item card">
                      <div className="flex justify-between items-start gap-sm">
                        <div>
                          <span className="badge badge-green">
                            {tResidue(grp.residueType)}
                          </span>
                          <h4 className="heading-sm mt-xs">{grp.clusterLocation}</h4>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-forest" style={{ fontSize: '1.25rem' }}>
                            {grp.totalQuantityTonnes} {t('tonnes')}
                          </span>
                          <p className="body-sm text-muted">({grp.farmerCount} {t('farmersCount')})</p>
                        </div>
                      </div>

                      <div className="collection-target mt-sm">
                        <span className="label">{t('targetIndustrialDemand')}</span>
                        <p className="font-semibold mt-xs">{grp.targetBuyer.orgName}</p>
                        <div className="flex items-center gap-xs mt-xs flex-wrap">
                          <span className="badge badge-muted">
                            Target: {grp.targetBuyer.requiredQuantity}t ({grp.fulfillmentPct}%)
                          </span>
                          {grp.indicativeLotValue && (
                            <span className="badge badge-green">
                              Est. Value: ₹{grp.indicativeLotValue.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="collection-farmers mt-sm">
                        <span className="label" style={{ display: 'block', marginBottom: '4px' }}>
                          {t('aggregatedFarmerListings')}
                        </span>
                        <div className="flex flex-col gap-xs">
                          {grp.participatingListings.map((p) => (
                            <div key={p.id} className="participating-row">
                              <span>{p.farmerName}</span>
                              <strong>{p.quantity} {t('tonnes')}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-sm">
                        <p className="body-sm text-muted" style={{ fontStyle: 'italic', lineHeight: 1.4 }}>
                          {grp.disclaimer}
                        </p>
                      </div>

                      <Link
                        to={`/match-details/${grp.targetBuyer.id}?listing=${grp.participatingListings[0].id}`}
                        className="btn btn-outline btn-sm w-full mt-sm"
                      >
                        {t('viewBuyerDossier')}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </FadeContent>

        {/* Security Restriction Modal */}
        {securityNotice && (
          <div className="security-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="security-modal-title">
            <div className="security-modal-card card">
              <div className="security-modal-header">
                <div>
                  <span className="label text-forest">{t('securityArchRequirement')}</span>
                  <h3 id="security-modal-title" className="heading-md mt-xs">{securityNotice.title}</h3>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setSecurityNotice(null)}
                  aria-label="Close dialog"
                >
                  {t('dismissBtn')}
                </button>
              </div>

              <p className="body-md font-medium text-forest mt-md">{securityNotice.message}</p>

              <div className="security-modal-tech-box mt-md">
                <strong>{t('technicalDetail')}:</strong> {securityNotice.technicalDetails}
              </div>

              <div className="security-modal-steps mt-md">
                <strong>{t('resolutionRequirement')}:</strong>
                <p className="body-sm text-muted mt-xs" style={{ lineHeight: 1.55 }}>
                  {securityNotice.resolution}
                </p>
              </div>

              <div className="flex justify-end mt-lg">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setSecurityNotice(null)}
                >
                  {t('understoodBtn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
