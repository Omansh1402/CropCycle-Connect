// src/components/DbStatus.jsx
// Shown at the top of forms when Supabase is not configured,
// or to display a database error after a failed submit.
import './DbStatus.css';

export function DbSetupBanner() {
  return (
    <div className="db-setup-banner" role="alert">
      <div className="db-setup-banner__icon">🔌</div>
      <div className="db-setup-banner__body">
        <h4 className="db-setup-banner__title">Database not connected</h4>
        <p className="db-setup-banner__text">
          This form will save to Supabase once configured. Follow the steps below to enable
          persistent storage:
        </p>
        <ol className="db-setup-steps">
          <li>
            <strong>Create a Supabase project</strong> at{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a>
          </li>
          <li>
            Run <code>supabase/schema.sql</code> in <em>SQL Editor → New Query</em> to create the tables.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> in the project root.
          </li>
          <li>
            Fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from{' '}
            <em>Supabase Dashboard → Settings → API</em>.
          </li>
          <li>
            Restart the dev server (<code>npm run dev</code>) — this banner will disappear.
          </li>
        </ol>
        <p className="db-setup-banner__note">
          ⚠️ Use only the <strong>anon / public</strong> key here — never the <code>service_role</code> key.
        </p>
      </div>
    </div>
  );
}

export function DbErrorAlert({ message, onRetry }) {
  return (
    <div className="db-error-alert" role="alert">
      <span className="db-error-alert__icon">❌</span>
      <div className="db-error-alert__body">
        <strong>Database error:</strong> {message}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-outline btn-sm db-error-alert__retry">
          Retry
        </button>
      )}
    </div>
  );
}

export function DbSuccessBanner({ message }) {
  return (
    <div className="db-success-banner" role="status">
      <span>✅</span>
      <span>{message || 'Saved to database successfully.'}</span>
    </div>
  );
}

export function LoadingSpinner({ label = 'Saving…' }) {
  return (
    <span className="db-spinner" aria-label={label}>
      <span className="db-spinner__ring" />
      <span className="db-spinner__label">{label}</span>
    </span>
  );
}
