/* The app icon: a water drop in federal blue with the gauge ripple, drawn
 * for next/og so every size is generated at build time. */

export function DropIcon({ size }: { size: number }) {
  const pad = Math.round(size * 0.16);
  const inner = size - pad * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F0F5FF',
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 64 64">
        <path d="M32 4C32 4 10 28 10 41a22 22 0 0 0 44 0C54 28 32 4 32 4z" fill="#1A4480" />
        <path d="M21 42c3.5-3 7-3 11 0s7.5 3 11 0" stroke="#F0F5FF" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M24 50c2.7-2 5.3-2 8 0s5.3 2 8 0" stroke="#F0F5FF" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.7" />
      </svg>
    </div>
  );
}
