'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const data = [
  { hour: 'Now', score: 42 },
  { hour: '1h', score: 48 },
  { hour: '2h', score: 55 },
  { hour: '3h', score: 61 },
  { hour: '4h', score: 58 },
  { hour: '5h', score: 50 },
  { hour: '6h', score: 44 },
];

const colorFor = (v: number) =>
  v >= 75 ? '#4A148C' : v >= 50 ? '#B71C1C' : v >= 25 ? '#E65100' : '#1B5E20';

export default function ForecastChart() {
  return (
    <div className="rounded-2xl border border-cs-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-cs-steel">
          6-hour risk forecast
        </p>
        <span className="text-xs text-cs-steel">Updated 14:32</span>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#E3EDFF" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: '#4A6FA5', fontSize: 12 }}
              axisLine={{ stroke: '#CDD8ED' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#4A6FA5', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ fill: '#F0F5FF' }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #CDD8ED',
                fontSize: 12,
              }}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.hour} fill={colorFor(d.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
