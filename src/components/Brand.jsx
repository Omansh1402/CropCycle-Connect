// src/components/Brand.jsx
// Single source of truth for the logo + wordmark. Used by the Navbar AND the
// Welcome screen so both always render the same size and shape. Do not add
// responsive size changes here: the logo must not resize between pages.
import './Brand.css';

export default function Brand() {
  return (
    <span className="brand">
      <span className="logo-symbol" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.477 2 2 6.477 2 12C2 14.83 3.177 17.388 5.07 19.21L6.48 17.79C4.94 16.32 4 14.27 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 14.27 19.06 16.32 17.52 17.79L18.93 19.21C20.823 17.388 22 14.83 22 12C22 6.477 17.523 2 12 2Z"
            fill="currentColor"
          />
          <path
            d="M12 7C9.239 7 7 9.239 7 12C7 13.43 7.6 14.72 8.56 15.63L9.97 14.22C9.37 13.66 9 12.87 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12C15 12.87 14.63 13.66 14.03 14.22L15.44 15.63C16.4 14.72 17 13.43 17 12C17 9.239 14.761 7 12 7Z"
            fill="currentColor"
            opacity="0.8"
          />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </span>
      <span className="logo-text">
        <span className="logo-title">CropCycle</span>
        <span className="logo-badge">Connect</span>
      </span>
    </span>
  );
}
