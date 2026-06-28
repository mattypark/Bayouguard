'use client';

/* Small "you are here" locator: a simplified silhouette of Texas with the
 * Houston metro pinned. The watershed graph only spans one metro, so this gives
 * the statewide context the graph itself can't. Pure SVG, theme-aware. */

// Simplified Texas border, clockwise from the NW panhandle. [lng, lat].
const TX: Array<[number, number]> = [
  [-103.04, 36.5],
  [-100.0, 36.5],
  [-100.0, 34.56],
  [-99.2, 34.21],
  [-98.1, 34.05],
  [-97.46, 33.82],
  [-96.4, 33.78],
  [-95.3, 33.87],
  [-94.49, 33.64],
  [-94.04, 33.02],
  [-94.04, 31.0],
  [-93.52, 30.3],
  [-93.83, 29.69],
  [-94.73, 29.29],
  [-95.37, 28.8],
  [-96.5, 28.38],
  [-97.35, 27.38],
  [-97.15, 26.2],
  [-97.35, 25.84],
  [-98.24, 26.06],
  [-99.1, 26.42],
  [-99.45, 27.27],
  [-100.0, 28.05],
  [-100.65, 29.07],
  [-101.4, 29.77],
  [-102.3, 29.88],
  [-102.8, 29.22],
  [-103.28, 29.0],
  [-104.46, 29.57],
  [-104.92, 30.62],
  [-106.0, 31.39],
  [-106.62, 31.91],
  [-106.62, 32.0],
  [-103.04, 32.0],
];

const HOUSTON: [number, number] = [-95.3698, 29.7604];

const W = 190;
const H = 165;
const PAD = 12;
const COS = Math.cos((31 * Math.PI) / 180); // aspect correction at TX mid-latitude

// Build the projection once at module load.
const xs = TX.map(([lng]) => lng * COS);
const ys = TX.map(([, lat]) => lat);
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);
const scale = Math.min((W - PAD * 2) / (maxX - minX), (H - PAD * 2) / (maxY - minY));
const offX = (W - (maxX - minX) * scale) / 2;
const offY = (H - (maxY - minY) * scale) / 2;

function project(lng: number, lat: number): [number, number] {
  return [
    (lng * COS - minX) * scale + offX,
    H - ((lat - minY) * scale + offY), // flip y so north is up
  ];
}

const PATH =
  TX.map(([lng, lat], i) => {
    const [x, y] = project(lng, lat);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z';

const [hx, hy] = project(HOUSTON[0], HOUSTON[1]);

export default function TexasLocator() {
  return (
    <div className="ob-panel pointer-events-none flex flex-col items-center gap-1 rounded-2xl p-3 shadow-panel">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Locator map of Texas with Houston highlighted"
      >
        <path
          d={PATH}
          className="fill-ob-accent/5 stroke-ob-faint"
          strokeWidth={1.25}
          strokeLinejoin="round"
        />
        {/* Houston ping */}
        <circle cx={hx} cy={hy} r={9} className="fill-ob-accent/15" />
        <circle cx={hx} cy={hy} r={3.4} className="fill-ob-accent" />
        <text
          x={hx - 6}
          y={hy + 1}
          textAnchor="end"
          dominantBaseline="middle"
          className="fill-ob-text font-mono"
          fontSize={9}
          fontWeight={600}
        >
          Houston
        </text>
      </svg>
      <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-ob-faint">
        Texas · TX-07
      </span>
    </div>
  );
}
