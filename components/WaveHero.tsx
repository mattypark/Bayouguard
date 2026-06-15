'use client';

/* Subtle animated wave SVG sitting behind hero. Two layers drift in opposite
   directions. Pure decorative — disabled by prefers-reduced-motion. */

export default function WaveHero() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden md:h-56">
      <svg
        className="wave-drift absolute bottom-0 left-[-10%] h-full w-[120%]"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="#D6F2F3"
          d="M0,120 C240,180 480,40 720,90 C960,140 1200,60 1440,110 L1440,200 L0,200 Z"
        />
      </svg>
      <svg
        className="wave-drift-2 absolute bottom-0 left-[-10%] h-full w-[120%] opacity-70"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="#E3EDFF"
          d="M0,150 C240,100 480,200 720,150 C960,100 1200,200 1440,150 L1440,200 L0,200 Z"
        />
      </svg>
    </div>
  );
}
