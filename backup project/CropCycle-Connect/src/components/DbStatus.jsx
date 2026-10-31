// src/components/DbStatus.jsx
import './DbStatus.css';

export function DbSetupBanner() {
  return (
    <div className="db-setup-banner" role="alert">
      <div className="db-setup-banner__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      </div>
      <div className="db-setup-banner__body">
        <div className="db-setup-banner__header">
          <h4 className="db-setup-banner__title">Remote Database Connection Standby</h4>
          <span className="badge badge-muted">Local Demo Mode Active</span>
        </div>
        <p className="db-setup-banner__text">
          Listings and contact requests are currently operating in local storage mode. To activate
          persistent PostgreSQL syncing, verify your Supabase environment configuration:
        </p>
        <ol className="db-setup-steps">
          <li>
            Execute <code>supabase/schema.sql</code> in your project’s Supabase SQL Editor.
          </li>
          <li>
            Verify <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
          </li>
          <li>
            Reload dev environment (<code>npm run dev</code>) to transition to live database syncing.
          </li>
        </ol>
      </div>
    </div>
  );
}

export function DbErrorAlert({ message, onRetry }) {
  return (
    <div className="db-error-alert" role="alert">
      <div className="db-error-alert__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="db-error-alert__body">
        <span className="db-error-alert__title">Database Error:</span> {message}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-outline btn-sm db-error-alert__retry">
          Retry Request
        </button>
      )}
    </div>
  );
}

export function DbSuccessBanner({ message }) {
  return (
    <div className="db-success-banner" role="status">
      <div className="db-success-banner__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <span>{message || 'Record successfully committed to database.'}</span>
    </div>
  );
}

export function LoadingSpinner({ label = 'Processing…' }) {
  return (
    <div className="db-spinner" aria-label={label}>
      <span className="db-spinner__ring" />
      <span className="db-spinner__label">{label}</span>
    </div>
  );
}
