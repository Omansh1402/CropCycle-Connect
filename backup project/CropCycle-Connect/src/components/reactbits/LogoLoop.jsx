'use client';

import { memo, useMemo } from 'react';
import './LogoLoop.css';

/**
 * ReactBits LogoLoop component.
 * Seamless infinite horizontal ticker for verified feedstocks and industrial partners.
 */
export const LogoLoop = memo(
  ({
    items = [],
    speed = 35, // seconds for one full loop
    gap = 24,
    fadeOut = true,
    pauseOnHover = true,
    className = '',
    style = {}
  }) => {
    // Duplicate items to guarantee infinite seamless wrap
    const duplicatedItems = useMemo(() => [...items, ...items, ...items], [items]);

    const maskGradient = fadeOut
      ? 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)'
      : undefined;

    return (
      <div
        className={`logoloop ${className}`}
        style={{
          WebkitMaskImage: maskGradient,
          maskImage: maskGradient,
          ...style
        }}
        role="region"
        aria-label="Feedstocks and Industry Applications"
      >
        <div
          className="logoloop__track"
          style={{
            display: 'flex',
            animation: `logoloop-scroll ${speed}s linear infinite`,
            gap: `${gap}px`
          }}
          onMouseEnter={e => {
            if (pauseOnHover) e.currentTarget.style.animationPlayState = 'paused';
          }}
          onMouseLeave={e => {
            if (pauseOnHover) e.currentTarget.style.animationPlayState = 'running';
          }}
        >
          {duplicatedItems.map((item, idx) => (
            <div className="logoloop__item" key={idx} role="listitem">
              <div className="logoloop__content">
                {item.icon && <span className="logoloop__node">{item.icon}</span>}
                <span className="logoloop__label">{item.title}</span>
                {item.subtitle && (
                  <span style={{ fontSize: '11px', color: '#737C74', fontWeight: 400 }}>
                    {item.subtitle}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes logoloop-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-33.333%); }
          }
        `}</style>
      </div>
    );
  }
);

LogoLoop.displayName = 'LogoLoop';
export default LogoLoop;
