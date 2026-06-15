'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';
import gsap from 'gsap';

export type Tier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const TIER_BG: Record<Tier, string> = {
  LOW: '#1B5E20',
  MEDIUM: '#E65100',
  HIGH: '#B71C1C',
  CRITICAL: '#4A148C',
};

const TIER_RINGS: Record<Tier, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 3 };

export default function RiskBadge({
  score,
  tier,
  message,
}: {
  score: number;
  tier: Tier;
  message: string;
}) {
  const numRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGPathElement>(null);

  // Number count-up via anime.js
  useEffect(() => {
    if (!numRef.current) return;
    const obj = { v: 0 };
    anime({
      targets: obj,
      v: score,
      duration: 1800,
      easing: 'easeOutCubic',
      update: () => {
        if (numRef.current) numRef.current.textContent = Math.round(obj.v).toString();
      },
    });
  }, [score]);

  // Arc sweep via GSAP — 0..100 -> 0..180°, dashoffset goes 220 -> remaining
  useEffect(() => {
    if (!arcRef.current) return;
    const total = 220;
    const pct = Math.max(0, Math.min(100, score)) / 100;
    gsap.fromTo(
      arcRef.current,
      { strokeDashoffset: total },
      { strokeDashoffset: total - total * pct, duration: 1.2, ease: 'power2.out' },
    );
  }, [score]);

  const rings = TIER_RINGS[tier];
  const bg = TIER_BG[tier];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ color: bg }}>
        {/* Ripple rings */}
        {rings >= 1 && <span className="ripple-ring" />}
        {rings >= 2 && <span className="ripple-ring r2" />}
        {rings >= 3 && <span className="ripple-ring r3" />}

        {/* Arc sweep behind badge */}
        <svg className="absolute -inset-3" viewBox="0 0 100 100" aria-hidden>
          <path
            ref={arcRef}
            d="M 8,50 A 42,42 0 1 1 92,50"
            fill="none"
            stroke={bg}
            strokeOpacity="0.35"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="220"
            strokeDashoffset="220"
          />
        </svg>

        {/* Badge circle */}
        <div
          className="risk-badge relative flex h-20 w-20 flex-col items-center justify-center rounded-full text-white shadow-lg md:h-24 md:w-24"
          style={{ backgroundColor: bg }}
          role="status"
          aria-live="polite"
          aria-label={`Current flood risk: ${tier}. Score ${score} out of 100.`}
        >
          <span ref={numRef} className="font-mono text-2xl font-bold leading-none md:text-3xl">
            0
          </span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-wider md:text-xs">
            {tier}
          </span>
        </div>
      </div>

      <p className="mt-3 max-w-xs text-center text-sm text-cs-midnight">{message}</p>
      <p className="text-xs text-cs-steel">Score {score} / 100</p>
    </div>
  );
}
