'use client';

/* Mobile bottom sheet: drag the handle between a peek and an expanded snap
 * point, or swipe down past the peek to close. Only the handle starts a
 * drag, so the content scrolls normally. Sits above the bottom tab bar. */

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';

type Snap = 'peek' | 'full';

export default function BottomSheet({
  children,
  label,
  onClose,
  peek = 0.35,
  full = 0.85,
  initial = 'peek',
  bottomOffset = 'calc(56px + env(safe-area-inset-bottom))',
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  /** Visible share of the viewport at each snap point. */
  peek?: number;
  full?: number;
  initial?: Snap;
  bottomOffset?: string;
}) {
  const controls = useDragControls();
  const [snap, setSnap] = useState<Snap>(initial);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  useEffect(() => {
    const read = () => setVh(window.innerHeight);
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  const height = vh * full;
  const peekY = height - vh * peek;
  const y = snap === 'full' ? 0 : peekY;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const end = y + info.offset.y + info.velocity.y * 0.2;
    if (end > peekY + vh * 0.12) onClose();
    else setSnap(end < peekY / 2 ? 'full' : 'peek');
  };

  return (
    <motion.section
      role="dialog"
      aria-label={label}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: -y, bottom: vh }}
      dragElastic={{ top: 0.05, bottom: 0.4 }}
      onDragEnd={onDragEnd}
      initial={{ y: height }}
      animate={{ y }}
      exit={{ y: height }}
      transition={{ type: 'tween', duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="ob-panel ob-float fixed inset-x-0 z-[80] flex flex-col rounded-t-xl"
      style={{ height, bottom: bottomOffset }}
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        onClick={() => setSnap((s) => (s === 'peek' ? 'full' : 'peek'))}
        aria-label={label}
        aria-expanded={snap === 'full'}
        className="flex h-6 w-full shrink-0 touch-none items-center justify-center"
      >
        <span className="h-1.5 w-10 rounded-full bg-ob-border" aria-hidden />
      </button>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </motion.section>
  );
}
