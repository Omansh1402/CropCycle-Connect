'use client';

import { animate, cubicBezier, useInView } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const clamp01 = value => Math.min(1, Math.max(0, value));

const EASINGS = {
  linear: t => t,
  easeOut: cubicBezier(0.33, 1, 0.68, 1),
  expo: t => (t >= 1 ? 1 : (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10)))
};

const getDecimalPlaces = num => {
  const str = num.toString();
  if (str.includes('.')) {
    const decimals = str.split('.')[1];
    if (parseInt(decimals, 10) !== 0) {
      return decimals.length;
    }
  }
  return 0;
};

const group = (int, separator) => (separator ? int.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : int);

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 1.8,
  className = '',
  style,
  startWhen = true,
  separator = '',
  prefix = '',
  suffix = '',
  easing = 'easeOut',
  decimals,
  trigger = 'view',
  onStart,
  onEnd
}) {
  const ref = useRef(null);
  const textRef = useRef(null);
  const startValue = direction === 'down' ? to : from;
  const endValue = direction === 'down' ? from : to;
  const valueRef = useRef(startValue);
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const active = trigger === 'load' || isInView;
  const places = decimals ?? Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    latest => {
      const fixed = Math.abs(latest).toFixed(places);
      const [int, frac = ''] = fixed.split('.');
      const body = `${latest < 0 && Number(fixed) !== 0 ? '-' : ''}${group(int, separator)}${frac ? `.${frac}` : ''}`;
      return `${prefix}${body}${suffix}`;
    },
    [places, separator, prefix, suffix]
  );

  const [initialText] = useState(() => formatValue(startValue));

  useEffect(() => {
    if (!active || !startWhen) return undefined;

    const ease = EASINGS[easing] || EASINGS.easeOut;
    const total = Math.max(0, duration);
    const progress = t => (total > 0 ? clamp01(t / total) : 1);

    const render = t => {
      const value = startValue + (endValue - startValue) * ease(progress(t));
      valueRef.current = value;
      if (textRef.current) textRef.current.textContent = formatValue(value);
    };

    if (typeof onStart === 'function') onStart();

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      valueRef.current = endValue;
      if (textRef.current) textRef.current.textContent = formatValue(endValue);
      if (typeof onEnd === 'function') onEnd();
      return undefined;
    }

    const controls = animate(0, total, {
      duration: total,
      delay,
      ease: 'linear',
      onUpdate: render,
      onComplete: () => {
        valueRef.current = endValue;
        if (textRef.current) textRef.current.textContent = formatValue(endValue);
        if (typeof onEnd === 'function') onEnd();
      }
    });

    return () => controls.stop();
  }, [active, startWhen, startValue, endValue, duration, delay, easing, formatValue, onStart, onEnd]);

  return (
    <span
      className={className}
      ref={ref}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
    >
      <span ref={textRef}>{initialText}</span>
    </span>
  );
}
