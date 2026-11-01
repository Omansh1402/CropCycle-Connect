// src/components/DbStatus.jsx
import './DbStatus.css';
import { useTranslation } from '../lib/i18n';

export function DbSetupBanner({ t }) {
  const context = useTranslation();
  const translate = t || context.t;
  const label = (key) => translate(key);
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
          <h4 className="db-setup-banner__title">{label('db.setup.title')}</h4>
          <span className="badge badge-muted">{label('db.setup.mode')}</span>
        </div>
        <p className="db-setup-banner__text">
          {label('db.setup.description')}
        </p>
        <ol className="db-setup-steps">
          <li>
            {label('db.setup.stepOne')} <code>supabase/schema.sql</code> {label('db.setup.stepOneEnd')}
          </li>
          <li>
            {label('db.setup.stepTwoStart')} <code>VITE_SUPABASE_URL</code> {label('db.setup.and')} <code>VITE_SUPABASE_ANON_KEY</code> {label('db.setup.stepTwoEnd')} <code>.env.local</code>.
          </li>
          <li>
            {label('db.setup.stepThreeStart')} (<code>npm run dev</code>) {label('db.setup.stepThreeEnd')}
          </li>
        </ol>
      </div>
    </div>
  );
}

export function DbErrorAlert({ message, onRetry, t }) {
  const context = useTranslation();
  const translate = t || context.t;
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
        <span className="db-error-alert__title">{translate('db.error.title')}</span> {message}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-outline btn-sm db-error-alert__retry">
          {translate('db.error.retry')}
        </button>
      )}
    </div>
  );
}

export function DbSuccessBanner({ message }) {
  const { t } = useTranslation();
  return (
    <div className="db-success-banner" role="status">
      <div className="db-success-banner__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <span>{message || t('db.success.saved')}</span>
    </div>
  );
}

export function LoadingSpinner({ label }) {
  const { t } = useTranslation();
  const spinnerLabel = label || t('db.loading');
  return (
    <div className="db-spinner" aria-label={spinnerLabel}>
      <span className="db-spinner__ring" />
      <span className="db-spinner__label">{spinnerLabel}</span>
    </div>
  );
}
