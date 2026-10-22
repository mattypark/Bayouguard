'use client';

/* framer-motion follows prefers-reduced-motion everywhere: transforms are
 * skipped and only opacity fades remain. */

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

export default function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
