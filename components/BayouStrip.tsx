'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

type Bayou = {
  name: string;
  stage: number;
  flood: number;
  spark: number[];
};

const BAYOUS: Bayou[] = [
  { name: 'Brays',     stage: 18.4, flood: 20, spark: [12,13,14,15,16,16.5,17,17.4,17.8,18,18.2,18.4] },
  { name: 'Buffalo',   stage: 14.1, flood: 25, spark: [11,11.4,12,12.6,13,13.2,13.4,13.6,13.8,13.9,14,14.1] },
  { name: 'White Oak', stage:  9.8, flood: 18, spark: [6,6.5,7,7.4,7.8,8.2,8.5,8.8,9,9.3,9.6,9.8] },
  { name: 'Cypress',   stage:  7.2, flood: 16, spark: [4,4.4,4.8,5.2,5.6,5.8,6,6.3,6.6,6.8,7,7.2] },
];

function headroomColor(stage: number, flood: number) {
  const room = flood - stage;
  if (room <= 2) return '#B71C1C';
  if (room <= 5) return '#E65100';
  return '#1B5E20';
}

export default function BayouStrip() {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-cs-steel">
          Bayou snapshot
        </p>
        <a href="/map" className="text-xs font-medium text-cs-teal hover:underline">
          View all on map →
        </a>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {BAYOUS.map((b, i) => {
          const c = headroomColor(b.stage, b.flood);
          const room = (b.flood - b.stage).toFixed(1);
          const data = b.spark.map((v, idx) => ({ x: idx, y: v }));
          return (
            <div
              key={b.name}
              className="card-reveal min-w-[160px] flex-shrink-0 rounded-2xl border border-cs-border bg-white p-3 shadow-sm"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <p className="text-xs font-semibold text-cs-midnight">{b.name}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-cs-teal">
                {b.stage.toFixed(1)}<span className="text-xs text-cs-steel"> ft</span>
              </p>
              <p className="text-[11px] text-cs-steel">of {b.flood} ft flood stage</p>
              <div className="my-1 h-8">
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke={c}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p
                className="text-[11px] font-medium"
                style={{ color: c }}
              >
                {room} ft headroom
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
