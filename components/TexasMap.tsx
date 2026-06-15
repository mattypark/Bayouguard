'use client';

/* Texas silhouette as decorative background SVG. Drops a teal pin on Houston.
 * Pure decoration — aria-hidden. Slow drift on Houston pin pulse. */

export default function TexasMap({
  className = '',
  showHoustonPin = true,
}: {
  className?: string;
  showHoustonPin?: boolean;
}) {
  // Houston roughly at (380, 380) in this 600x500 viewBox.
  const hx = 408;
  const hy = 360;

  return (
    <svg
      className={className}
      viewBox="0 0 600 500"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="tx-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#E3EDFF" />
          <stop offset="100%" stopColor="#D6F2F3" />
        </linearGradient>
        <filter id="tx-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      {/* Simplified Texas outline. Recognizable: panhandle top-left,
          El Paso point left, Gulf Coast right side, southern tip below. */}
      <path
        d="
          M 170,60
          L 290,60
          L 290,110
          L 360,110
          L 470,110
          L 478,140
          L 488,170
          L 502,210
          L 512,250
          L 502,290
          L 480,318
          L 452,338
          L 422,356
          L 402,378
          L 384,398
          L 356,410
          L 322,400
          L 296,386
          L 268,372
          L 244,356
          L 222,340
          L 198,322
          L 178,296
          L 158,268
          L 138,238
          L 122,206
          L 110,170
          L 104,134
          L 116,98
          L 142,72
          Z
        "
        fill="url(#tx-fill)"
        stroke="#CDD8ED"
        strokeWidth="1.5"
        filter="url(#tx-soft)"
      />

      {/* Houston pin */}
      {showHoustonPin && (
        <g>
          {/* expanding ripple */}
          <circle cx={hx} cy={hy} r="8" fill="#00939A" opacity="0.25">
            <animate attributeName="r" values="8;26;8" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={hx} cy={hy} r="6" fill="#00939A" />
          <circle cx={hx} cy={hy} r="2" fill="#FFFFFF" />
          <text
            x={hx + 12}
            y={hy + 4}
            fill="#1A4480"
            fontSize="13"
            fontWeight="600"
            fontFamily="ui-sans-serif, system-ui"
          >
            Houston
          </text>
        </g>
      )}
    </svg>
  );
}
