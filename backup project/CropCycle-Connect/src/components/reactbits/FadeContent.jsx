'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * ReactBits FadeContent component.
 * Wrapper that fades and translates content into view smoothly on scroll.
 */
export default function FadeContent({
  children,
  blur = false,
  duration = 0.7,
  delay = 0,
  threshold = 0.1,
  distance = 24,
  direction = 'up',
  className = '',
  style = {},
  once = true,
  ...props
}) {
  const reduced = useReducedMotion();
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const sign = direction === 'down' || direction === 'right' ? -1 : 1;
  const initialOffset = sign * distance;

  if (reduced) {
    return (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        [axis]: initialOffset,
        filter: blur ? 'blur(8px)' : 'none'
      }}
      whileInView={{
        opacity: 1,
        [axis]: 0,
        filter: 'blur(0px)'
      }}
      viewport={{ once, amount: threshold }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}
