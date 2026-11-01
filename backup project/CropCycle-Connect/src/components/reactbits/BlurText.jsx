'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

/**
 * ReactBits BlurText component.
 * Text starts softly blurred and resolves into crisp focus with staggered timing.
 */
export default function BlurText({
  text = '',
  delay = 0.06,
  duration = 0.55,
  direction = 'top',
  blur = 8,
  distance = 18,
  threshold = 0.1,
  once = true,
  className = '',
  style = {},
  color
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const reduced = useReducedMotion();

  if (!text) return null;

  if (reduced) {
    return (
      <div ref={ref} className={className} style={{ color, ...style }}>
        {text}
      </div>
    );
  }

  const words = text.split(' ');
  const yOffset = direction === 'top' ? -distance : distance;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay,
        delayChildren: 0.04
      }
    }
  };

  const wordVariants = {
    hidden: {
      opacity: 0,
      y: yOffset,
      filter: `blur(${blur}px)`
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      style={{ display: 'inline-flex', flexWrap: 'wrap', color, ...style }}
    >
      {words.map((word, i) => (
        <span key={i} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          <motion.span
            variants={wordVariants}
            style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </motion.div>
  );
}
