import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
      return `${t('common.sampleBuyer', 'Sample Buyer')} (${r.demo_buyer_ref})`;
    }
    return t('common.registeredBuyer', 'Registered Buyer');
  };

  const activeKpis = useMemo(() => {
    if (filterScope === 'real') {
      return {
        listings: liveKpis.real?.listings ?? 0,
        listingsBreakdown: t('dashboard.kpiLiveLotsDesc', 'Live entries in PostgreSQL database'),
        buyers: liveKpis.real?.buyers ?? 0,
        buyersBreakdown: t('dashboard.kpiLiveBuyersDesc', 'Verified industrial buyer entities'),
        requests: liveKpis.real?.requests ?? 0,
        requestsBreakdown: t('dashboard.kpiLiveRequestsDesc', 'Active sourcing inquiries'),
        volume: `${liveKpis.real?.quantityTonnes ?? 0}t`,
        volumeBreakdown: t('dashboard.kpiLiveVolumeDesc', 'Active harvest volume listed'),
      };
    }
    if (filterScope === 'demo') {
      return {
        listings: liveKpis.demo?.listings ?? 0,
        listingsBreakdown: t('dashboard.kpiDemoLotsDesc', 'Demonstration seed lots'),
        buyers: liveKpis.demo?.buyers ?? 0,
        buyersBreakdown: t('dashboard.kpiDemoBuyersDesc', 'Reference industrial accounts'),
        requests: liveKpis.demo?.requests ?? 0,
        requestsBreakdown: t('dashboard.kpiDemoRequestsDesc', 'Simulated haulage requests'),
        volume: `${liveKpis.demo?.quantityTonnes ?? 0}t`,
        volumeBreakdown: t('dashboard.kpiDemoVolumeDesc', 'Demonstration baseline capacity'),
      };
    }
    return {
      listings: liveKpis.totalListings,
      listingsBreakdown: `${liveKpis.real?.listings ?? 0} ${t('dashboard.badgeLive')} · ${liveKpis.demo?.listings ?? 0} ${t('dashboard.badgeReference')}`,
      buyers: liveKpis.totalBuyers,
      buyersBreakdown: `${liveKpis.real?.buyers ?? 0} ${t('dashboard.badgeLive')} · ${liveKpis.demo?.buyers ?? 0} ${t('dashboard.badgeReference')}`,
      requests: liveKpis.totalRequests,
      requestsBreakdown: `${liveKpis.real?.requests ?? 0} ${t('dashboard.badgeLive')} · ${liveKpis.demo?.requests ?? 0} ${t('dashboard.badgeReference')}`,
      volume: `${liveKpis.totalQuantityTonnes ?? liveKpis.tonsRedirected}t`,
      volumeBreakdown: `${liveKpis.real?.quantityTonnes ?? 0}t ${t('dashboard.badgeLive')} · ${liveKpis.demo?.quantityTonnes ?? 0}t ${t('dashboard.badgeReference')}`,
    };
  }, [liveKpis, filterScope, t]);

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
    { id: 'overview',    label: t('dashboard.tabOverview') },
    { id: 'listings',    label: `${t('dashboard.tabListings')} (${filteredListings.length})` },
    { id: 'requests',    label: `${t('dashboard.tabRequests')} (${filteredRequests.length})` },
    { id: 'buyers',      label: `${t('dashboard.tabBuyers')} (${filteredBuyers.length})` },
    { id: 'collections', label: `${t('dashboard.tabCollections')} (${groupings.length})` },
  ];

  return (
    <main className="dashboard-page">
      <header className="page-header">
        <div className="container">
          <div className="page-header__inner">
            <span className="section-eyebrow">{t('dashboard.consoleEyebrow')}</span>
            <SplitText
              key={`dash-title-${i18n.language}`}
              text={t('dashboard.title')}
              tag="h1"
              className="display-lg"
              delay={0.03}
            />
            <p className="body-lg text-muted mt-xs" style={{ maxWidth: '640px' }}>
              {isLiveData
                ? t('dashboard.liveConnectedDesc')
                : t('dashboard.demoDesc')}
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
              {isLiveData ? t('dashboard.activePostgres') : t('dashboard.demoCatalog')}
            </span>
            {isLiveData && (
              <span className="body-sm text-muted">· {t('dashboard.realtimeSync')}</span>
            )}
          </div>
          <div className="flex items-center gap-md">
            {isLiveData && !loading && (
              <button onClick={refetch} className="btn btn-outline btn-sm">
                {t('dashboard.refreshRecords')}
              </button>
            )}
            {loading && <LoadingSpinner label={t('dashboard.queryingDb')} />}
          </div>
        </div>

        {/* Scope Filter Bar */}
        <div className="activity-banner card mb-lg">
          <div className="flex justify-between items-center flex-wrap gap-md">
            <div className="flex items-center gap-sm flex-wrap">
              <span className="badge badge-green">
                {t('dashboard.liveDataBadge', {
                  listings: liveKpis.real?.listings ?? 0,
                  qty: liveKpis.real?.quantityTonnes ?? 0,
                  buyers: liveKpis.real?.buyers ?? 0,
                  requests: liveKpis.real?.requests ?? 0,
                })}
              </span>
              <span className="badge badge-muted">
                {t('dashboard.referenceDataBadge', {
                  listings: liveKpis.demo?.listings ?? 0,
                  qty: liveKpis.demo?.quantityTonnes ?? 0,
                  buyers: liveKpis.demo?.buyers ?? 0,
                })}
              </span>
            </div>
            <div className="scope-btn-group">
              <span className="label" style={{ marginRight: '4px' }}>{t('dashboard.scopeLabel')}</span>
              <button
                type="button"
                className={`scope-btn ${filterScope === 'all' ? 'active' : ''}`}
                onClick={() => setFilterScope('all')}
              >
                {t('dashboard.allRecords')}
              </button>
              <button
                type="button"
                className={`scope-btn ${filterScope === 'real' ? 'active' : ''}`}
                onClick={() => setFilterScope('real')}
              >
                {t('dashboard.liveOnly')}
              </button>
              <button
                type="button"
                className={`scope-btn ${filterScope === 'demo' ? 'active' : ''}`}
                onClick={() => setFilterScope('demo')}
              >
                {t('dashboard.referenceOnly')}
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
            <div className="label">{t('dashboard.supplyListings')}</div>
            <div className="stat-label mt-xs">{activeKpis.listingsBreakdown}</div>
            <Link to="/farmer" className="stat-action-link mt-sm">{t('dashboard.postListingArrow')}</Link>
          </div>

          <div className="stat-card">
            <div className="stat-value">
              {loading ? '—' : typeof activeKpis.buyers === 'number' ? <CountUp to={activeKpis.buyers} duration={1.4} /> : activeKpis.buyers}
            </div>
            <div className="label">{t('dashboard.industrialBuyers')}</div>
            <div className="stat-label mt-xs">{activeKpis.buyersBreakdown}</div>
            <Link to="/buyer" className="stat-action-link mt-sm">{t('dashboard.registerDemandArrow')}</Link>
          </div>

          <div className="stat-card">
            <div className="stat-value">
              {loading ? '—' : typeof activeKpis.requests === 'number' ? <CountUp to={activeKpis.requests} duration={1.4} /> : activeKpis.requests}
            </div>
            <div className="label">{t('dashboard.sourcingInquiries')}</div>
            <div className="stat-label mt-xs">{activeKpis.requestsBreakdown}</div>
            <Link to="/matches" className="stat-action-link mt-sm">{t('dashboard.inspectMatchesArrow')}</Link>
          </div>

          <div className="stat-card">
            <div className="stat-value">
              {loading ? '—' : typeof activeKpis.volume === 'number' ? <CountUp to={activeKpis.volume} suffix="t" duration={1.6} /> : activeKpis.volume}
            </div>
            <div className="label">{t('dashboard.biomassVolume')}</div>
            <div className="stat-label mt-xs">{activeKpis.volumeBreakdown}</div>
            <span className="stat-label mt-sm" style={{ display: 'block', color: 'var(--color-forest)' }}>
              {t('dashboard.avoidedBurn')}: {typeof liveKpis.tonsRedirected === 'number' ? <CountUp to={liveKpis.tonsRedirected} suffix="t" duration={1.6} /> : `${liveKpis.tonsRedirected}t`}
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
              {t('dashboard.dismiss')}
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
                    <h2 className="heading-md">{t('dashboard.recentSupplyListings')}</h2>
                    <Link to="/farmer" className="btn btn-primary btn-sm">{t('dashboard.postListingBtn')}</Link>
                  </div>
                  <div className="table-wrapper mt-md">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('dashboard.thProducer')}</th>
                          <th>{t('dashboard.thResidue')}</th>
                          <th>{t('dashboard.thTonnage')}</th>
                          <th>{t('dashboard.thStatus')}</th>
                          {isLiveData && <th>{t('dashboard.thScope')}</th>}
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
                              <td>{t(`crops.${l.residue_type ?? l.residueType}`, l.residue_type ?? l.residueType)}</td>
                              <td><strong>{l.quantity_tonnes ?? l.quantity} t</strong></td>
                              <td>
                                <span className={`badge ${STATUS_BADGE[l.status] ?? 'badge-muted'}`}>
                                  {t(`common.${l.status}`, l.status)}
                                </span>
                              </td>
                              {isLiveData && (
                                <td>
                                  <span className={`badge ${l.is_demo ? 'badge-muted' : 'badge-green'}`}>
                                    {l.is_demo ? t('dashboard.badgeReference') : t('dashboard.badgeLive')}
                                  </span>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={isLiveData ? 5 : 4} className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>
                              {t('dashboard.noListingsActive')}
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
                    <h2 className="heading-md">{isLiveData ? t('dashboard.recentInquiries') : t('dashboard.recentMatches')}</h2>
                    <Link to="/matches" className="btn btn-outline btn-sm">{t('dashboard.inspectCatalog')}</Link>
                  </div>
                  <div className="match-list mt-md">
                    {isLiveData ? (
                      filteredRequests.length > 0 ? (
                        filteredRequests.slice(0, 4).map((r) => (
                          <div key={r.id} className="match-row">
                            <div className="match-row-info">
                              <div className="font-semibold text-forest">
                                {r.request_type ? t('dashboard.protocolLabel', { type: r.request_type.toUpperCase() }) : t('dashboard.protocolLabel', { type: 'HAULAGE' })}
                              </div>
                              <div className="body-sm text-muted">
                                {t('dashboard.targetLabel')}: {getBuyerDisplayName(r)} · {t('dashboard.fromLabel')}: {r.requester_name || 'Cooperative Lead'}
                              </div>
                              <div className="body-sm text-muted">
                                {new Date(r.created_at).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                            <span className={`badge ${STATUS_BADGE[`${r.status}-req`] ?? STATUS_BADGE[r.status] ?? 'badge-muted'}`}>
                              {t(`common.${r.status}`, r.status)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="body-sm text-muted text-center" style={{ padding: 'var(--space-xl)' }}>
                          {t('dashboard.noInquiriesActive')}
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
                                <div className="font-semibold">{listing ? t(`crops.${listing.residueType}`, listing.residueType) : ''} → {buyer?.orgName}</div>
                                <div className="body-sm text-muted">{m.notes}</div>
                              </div>
                              <span className={`badge ${STATUS_BADGE[m.status] ?? 'badge-muted'}`}>
                                {t(`common.${m.status}`, m.status)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="body-sm text-muted text-center" style={{ padding: 'var(--space-xl)' }}>
                          {t('dashboard.noMatchesAvailable')}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Quick actions bar */}
              <div className="mt-2xl">
                <h3 className="heading-md mb-md">{t('dashboard.marketplaceActions')}</h3>
                <div className="quick-action-grid">
                  <Link to="/farmer" className="quick-action-card card">
                    <span className="label">{t('dashboard.farmSupply')}</span>
                    <h4 className="heading-sm mt-xs">{t('dashboard.postResidueListing')}</h4>
                    <p className="body-sm text-muted mt-xs">{t('dashboard.postResidueDesc')}</p>
                  </Link>

                  <Link to="/buyer" className="quick-action-card card">
                    <span className="label">{t('dashboard.industrialSourcing')}</span>
                    <h4 className="heading-sm mt-xs">{t('dashboard.registerBuyerDemand')}</h4>
                    <p className="body-sm text-muted mt-xs">{t('dashboard.registerBuyerDesc')}</p>
                  </Link>

                  <Link to="/matches" className="quick-action-card card">
                    <span className="label">{t('dashboard.algorithmicIndex')}</span>
                    <h4 className="heading-sm mt-xs">{t('dashboard.inspectMarketplace')}</h4>
                    <p className="body-sm text-muted mt-xs">{t('dashboard.inspectMarketplaceDesc')}</p>
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
                    {t('dashboard.agriSupplyListings')}
                    <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{filteredListings.length}</span>
                  </h2>
                  <p className="body-sm text-muted mt-xs">
                    {t('dashboard.indexedLotsDesc')}
                  </p>
                </div>
                <Link to="/farmer" className="btn btn-primary btn-sm">{t('dashboard.postListingBtn')}</Link>
              </div>

              {filteredListings.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="heading-md">{t('dashboard.noListingsTitle')}</h3>
                  <p className="body-md text-muted">
                    {t('dashboard.noListingsDesc')}
                  </p>
                  <div className="empty-state-actions">
                    <Link to="/farmer" className="btn btn-primary">{t('dashboard.postListingBtn')}</Link>
                    {filterScope !== 'all' && (
                      <button type="button" className="btn btn-outline" onClick={() => setFilterScope('all')}>
                        {t('dashboard.showAllRecords')}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="table-wrapper mt-md">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('dashboard.thClassification')}</th>
                        <th>{t('dashboard.thProducer')}</th>
                        <th>{t('dashboard.thResidue')}</th>
                        <th>{t('dashboard.thTonnage')}</th>
                        <th>{t('dashboard.thLocation')}</th>
                        <th>{t('dashboard.thHarvestWindow')}</th>
                        <th>{t('dashboard.thLogisticsMode')}</th>
                        <th>{t('dashboard.thStatus')}</th>
                        <th>{t('dashboard.thAction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredListings.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <span className={`badge ${l.is_demo || l.isDemo ? 'badge-muted' : 'badge-green'}`}>
                              {l.is_demo || l.isDemo ? t('dashboard.badgeReference') : t('dashboard.badgeLive')}
                            </span>
                          </td>
                          <td>
                            <div className="font-semibold">{l.farmer_name ?? l.farmerName}</div>
                            <div className="body-sm text-muted">{l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : l.postedDate}</div>
                          </td>
                          <td>{t(`crops.${l.residue_type ?? l.residueType}`, l.residue_type ?? l.residueType)}</td>
                          <td><strong>{l.quantity_tonnes ?? l.quantity} t</strong></td>
                          <td>{l.location}{l.state ? `, ${l.state}` : ''}</td>
                          <td>{l.availability_date ?? l.availabilityDate}</td>
                          <td className="body-sm">{t(`pickup.${l.pickup_preference ?? l.pickupPreference}`, l.pickup_preference ?? l.pickupPreference)}</td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[l.status] ?? 'badge-muted'}`}>
                              {t(`common.${l.status}`, l.status)}
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
                                {t('dashboard.btnReactivate')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={actionState.loading && actionState.id === l.id}
                                onClick={() => handleUpdateListingStatus(l.id, 'matched', l.is_demo || l.isDemo)}
                              >
                                {t('dashboard.btnMarkMatched')}
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
                    {t('dashboard.sourcingInquiriesTitle')}
                    <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{filteredRequests.length}</span>
                  </h2>
                  <p className="body-sm text-muted mt-xs">
                    {t('dashboard.recordedCommsDesc')}
                  </p>
                </div>
                <Link to="/matches" className="btn btn-outline btn-sm">{t('dashboard.inspectMatchesArrow')}</Link>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="heading-md">{t('dashboard.noRequestsTitle')}</h3>
                  <p className="body-md text-muted">
                    {t('dashboard.noRequestsDesc')}
                  </p>
                  <Link to="/matches" className="btn btn-primary mt-sm">{t('dashboard.findCompatibleBuyers')}</Link>
                </div>
              ) : isLiveData ? (
                <div className="table-wrapper mt-md">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('dashboard.thRecordScope')}</th>
                        <th>{t('dashboard.thInquiryProtocol')}</th>
                        <th>{t('dashboard.thRequester')}</th>
                        <th>{t('dashboard.thTargetBuyer')}</th>
                        <th>{t('dashboard.thSpecNotes')}</th>
                        <th>{t('dashboard.thStatus')}</th>
                        <th>{t('dashboard.thDate')}</th>
                        <th>{t('dashboard.thAction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <span className={`badge ${r.is_demo || r.demo_buyer_ref ? 'badge-muted' : 'badge-green'}`}>
                              {r.is_demo || r.demo_buyer_ref ? t('dashboard.badgeReference') : t('dashboard.badgeLive')}
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
                              {t(`common.${r.status}`, r.status)}
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
                                  {t('dashboard.btnAccept')}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  disabled={actionState.loading && actionState.id === r.id}
                                  onClick={() => handleUpdateContactRequest(r.id, 'rejected', r.is_demo || !!r.demo_buyer_ref)}
                                >
                                  {t('dashboard.btnReject')}
                                </button>
                              </div>
                            ) : r.status === 'accepted' ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={actionState.loading && actionState.id === r.id}
                                onClick={() => handleUpdateContactRequest(r.id, 'completed', r.is_demo || !!r.demo_buyer_ref)}
                              >
                                {t('dashboard.btnCompleteHaulage')}
                              </button>
                            ) : (
                              <span className="body-sm text-muted">{t('dashboard.statusSettled')}</span>
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
                      <tr><th>Pairing</th><th>Fit Score</th><th>Notes</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((m) => {
                        const listing = sampleListings.find((l) => l.id === m.listingId);
                        const buyer   = sampleBuyers.find((b) => b.id === m.buyerId);
                        return (
                          <tr key={m.id}>
                            <td>
                              <div className="font-semibold">{listing ? t(`crops.${listing.residueType}`, listing.residueType) : ''} → {buyer?.orgName}</div>
                              <div className="body-sm text-muted">{listing?.location}</div>
                            </td>
                            <td><span className="badge badge-green">{m.matchScore}%</span></td>
                            <td><div className="body-sm">{m.notes}</div></td>
                            <td><span className={`badge ${STATUS_BADGE[m.status] ?? 'badge-muted'}`}>{t(`common.${m.status}`, m.status)}</span></td>
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
                    {t('dashboard.industrialBuyersTitle')}
                    <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{filteredBuyers.length}</span>
                  </h2>
                  <p className="body-sm text-muted mt-xs">
                    {t('dashboard.registeredProcessorsDesc')}
                  </p>
                </div>
                <Link to="/buyer" className="btn btn-primary btn-sm">{t('dashboard.registerBuyerBtn')}</Link>
              </div>

              {filteredBuyers.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="heading-md">{t('dashboard.noBuyersTitle')}</h3>
                  <p className="body-md text-muted">
                    {t('dashboard.noBuyersDesc')}
                  </p>
                  <Link to="/buyer" className="btn btn-primary mt-sm">{t('dashboard.registerDemandBtn')}</Link>
                </div>
              ) : (
                <div className="table-wrapper mt-md">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('dashboard.thRecordScope')}</th>
                        <th>{t('dashboard.thOrganisation')}</th>
                        <th>{t('dashboard.thFacilityLocation')}</th>
                        <th>{t('dashboard.thTargetOutput')}</th>
                        <th>{t('dashboard.thBatchSize')}</th>
                        <th>{t('dashboard.thMonthlyCap')}</th>
                        <th>{t('dashboard.thIntakeStatus')}</th>
                        <th>{t('dashboard.thAction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBuyers.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <span className={`badge ${b.is_demo || b.isDemo ? 'badge-muted' : 'badge-green'}`}>
                              {b.is_demo || b.isDemo ? t('dashboard.badgeReference') : t('dashboard.badgeLive')}
                            </span>
                          </td>
                          <td>
                            <div className="font-semibold">{b.org_name ?? b.orgName}</div>
                            <div className="tag-list mt-xs">
                              {((b.accepted_types || b.acceptedTypes) ?? []).slice(0, 2).map((tVal) => (
                                <span key={tVal} className="badge badge-green">{t(`crops.${tVal}`, tVal)}</span>
                              ))}
                            </div>
                          </td>
                          <td>{b.location}{b.state ? `, ${b.state}` : ''}</td>
                          <td>{b.intended_use ? t(`uses.${b.intended_use}`, b.intended_use) : (b.intendedUse ? t(`uses.${b.intendedUse}`, b.intendedUse) : '—')}</td>
                          <td><strong>{b.required_quantity_tonnes ?? b.requiredQuantity} t</strong></td>
                          <td>{b.max_intake_tonnes ?? b.maxIntake ?? t('buyer.flexibleCapacity')}</td>
                          <td>
                            <span className={`badge ${(b.availability_status === 'yes' || b.available) ? 'badge-green' : 'badge-muted'}`}>
                              {(b.availability_status === 'yes' || b.available) ? t('common.active') : t('common.onHold')}
                            </span>
                          </td>
                          <td>
                            <Link to={`/match-details/${b.id}`} className="btn btn-outline btn-sm">{t('dashboard.btnProfile')}</Link>
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
                    {t('dashboard.consolidatedClusterTitle')}
                    <span className="badge badge-muted" style={{ marginLeft: '8px' }}>{groupings.length} {t('common.opportunities', 'Opportunities')}</span>
                  </h2>
                  <p className="body-sm text-muted mt-xs">
                    {t('dashboard.multiFarmPoolingDesc')}
                  </p>
                </div>
                <Link to="/matches" className="btn btn-outline btn-sm">{t('dashboard.inspectMarketplace')}</Link>
              </div>

              {groupings.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="heading-md">{t('dashboard.noClusterTitle')}</h3>
                  <p className="body-md text-muted">
                    {t('dashboard.noClusterDesc')}
                  </p>
                  <Link to="/matches" className="btn btn-primary mt-sm">{t('dashboard.browseDirectMatches')}</Link>
                </div>
              ) : (
                <div className="collection-grid mt-lg">
                  {groupings.map((grp) => (
                    <div key={grp.id} className="collection-item card">
                      <div className="flex justify-between items-start gap-sm">
                        <div>
                          <span className="badge badge-green">
                            {t(`crops.${grp.residueType}`, grp.residueType)}
                          </span>
                          <h4 className="heading-sm mt-xs">{grp.clusterLocation}</h4>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-forest" style={{ fontSize: '1.25rem' }}>
                            {grp.totalQuantityTonnes}t
                          </span>
                          <p className="body-sm text-muted">({grp.farmerCount} {t('common.farmers', 'farmers')})</p>
                        </div>
                      </div>

                      <div className="collection-target mt-sm">
                        <span className="label">{t('matches.targetIndustrialDemand')}</span>
                        <p className="font-semibold mt-xs">{grp.targetBuyer.orgName}</p>
                        <div className="flex items-center gap-xs mt-xs flex-wrap">
                          <span className="badge badge-muted">
                            {t('matches.intakeTarget', { qty: grp.targetBuyer.requiredQuantity, pct: grp.fulfillmentPct })}
                          </span>
                          {grp.indicativeLotValue && (
                            <span className="badge badge-green">
                              {t('matches.estBatch', { val: grp.indicativeLotValue.toLocaleString('en-IN') })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="collection-farmers mt-sm">
                        <span className="label" style={{ display: 'block', marginBottom: '4px' }}>
                          {t('dashboard.aggregatedFarmerListings', 'Aggregated Farmer Listings:')}
                        </span>
                        <div className="flex flex-col gap-xs">
                          {grp.participatingListings.map((p) => (
                            <div key={p.id} className="participating-row">
                              <span>{p.farmerName}</span>
                              <strong>{p.quantity} {t('common.tonnes', 'tonnes')}</strong>
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
                        {t('dashboard.btnViewBuyerDossier')}
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
                  <span className="label text-forest">{t('dashboard.securityArchReq')}</span>
                  <h3 id="security-modal-title" className="heading-md mt-xs">{securityNotice.title}</h3>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setSecurityNotice(null)}
                  aria-label={t('dashboard.btnClose')}
                >
                  {t('dashboard.btnClose')}
                </button>
              </div>

              <p className="body-md font-medium text-forest mt-md">{securityNotice.message}</p>

              <div className="security-modal-tech-box mt-md">
                <strong>{t('dashboard.technicalDetailLabel')}</strong> {securityNotice.technicalDetails}
              </div>

              <div className="security-modal-steps mt-md">
                <strong>{t('dashboard.resolutionReqLabel')}</strong>
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
                  {t('dashboard.btnUnderstood')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
