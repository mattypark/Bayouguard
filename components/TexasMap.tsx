'use client';

/* Real Texas state boundary + Harris County highlight as decorative background.
 * Geometry is real GeoJSON (see lib/texasGeometry.ts). aria-hidden — pure decor. */

import { TX_VIEWBOX, TX_PATH, HARRIS_PATH, HOUSTON_XY } from '@/lib/texasGeometry';

export default function TexasMap({
  className = '',
  showHoustonPin = true,
}: {
  className?: string;
  showHoustonPin?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox={TX_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="tx-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E3EDFF" />
          <stop offset="100%" stopColor="#D6F2F3" />
        </linearGradient>
      </defs>

      {/* Texas state outline — real boundary */}
      <path
        d={TX_PATH}
        fill="url(#tx-fill)"
        stroke="#9DB8D9"
        strokeWidth={1.5}
        strokeLinejoin="round"
        fillRule="evenodd"
      />

      {/* Harris County (Houston) — highlighted */}
      <path
        d={HARRIS_PATH}
        fill="#7FD4D6"
        fillOpacity={0.55}
        stroke="#2BA6A8"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {showHoustonPin && (
        <g>
          <circle cx={HOUSTON_XY.x} cy={HOUSTON_XY.y} r={9} fill="#0E7C7B" fillOpacity={0.25}>
            <animate attributeName="r" values="9;18;9" dur="3s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.25;0;0.25" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={HOUSTON_XY.x} cy={HOUSTON_XY.y} r={6} fill="#0E7C7B" stroke="#fff" strokeWidth={2} />
        </g>
      )}
    </svg>
  );
}
