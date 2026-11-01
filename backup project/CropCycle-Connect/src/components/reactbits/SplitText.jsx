'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

/**
 * ReactBits SplitText component.
 * Splits text into individual words or characters for a staggered entrance reveal.
 * Respects prefers-reduced-motion and system cursor constraints.
 */
export default function SplitText({
  text = '',
  className = '',
  delay = 0.04, // seconds stagger between elements
  duration = 0.6,
  splitType = 'words', // 'words' | 'chars'
  tag: Tag = 'h1',
  textAlign = 'left',
  style = {},
  yOffset = 28,
  blur = 6,
  threshold = 0.1,
  once = true,
  onComplete
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const reducedMotion = useReducedMotion();

  if (!text) return null;

  if (reducedMotion) {
    return (
      <Tag ref={ref} className={className} style={{ textAlign, ...style }}>
        {text}
      </Tag>
    );
  }

  const words = text.split(' ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: yOffset,
      filter: blur > 0 ? `blur(${blur}px)` : 'none'
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
    <Tag
      ref={ref}
      className={`split-text-root ${className}`}
      style={{
        textAlign,
        display: 'inline-block',
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        ...style
      }}
    >
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        {text}
      </span>
      <motion.span
        aria-hidden="true"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        onAnimationComplete={() => onComplete?.()}
        style={{ display: 'inline', flexWrap: 'wrap' }}
      >
        {splitType === 'chars'
          ? words.map((word, wIdx) => (
              <span key={`w-${wIdx}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                {Array.from(word).map((char, cIdx) => (
                  <motion.span
                    key={`c-${wIdx}-${cIdx}`}
                    variants={itemVariants}
                    style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
                  >
                    {char}
                  </motion.span>
                ))}
                {wIdx < words.length - 1 && <span>&nbsp;</span>}
              </span>
            ))
          : words.map((word, wIdx) => (
              <span key={`w-${wIdx}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                <motion.span
                  variants={itemVariants}
                  style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
                >
                  {word}
                </motion.span>
                {wIdx < words.length - 1 && <span>&nbsp;</span>}
              </span>
            ))}
      </motion.span>
    </Tag>
  );
}
