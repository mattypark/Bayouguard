'use client';

/* Hourly risk for the next six hours as bars coloured by tier. Loaded lazily
 * (recharts is heavy) and labelled "Demo" until /forecast ships. */

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { Forecast } from '@/lib/contract';
import { TIER_HEX } from '@/lib/theme';
import { useDocumentTheme } from '@/lib/useDocumentTheme';
import { useI18n } from '@/lib/i18n';
import { tierForScore } from './tierForScore';

export default function ForecastChart({ forecast }: { forecast: Forecast }) {
  const mode = useDocumentTheme();
  const { t } = useI18n();
  const data = forecast.scores.slice(0, 7).map((score, i) => ({
    label: i === 0 ? t('forecast.now') : `+${i}h`,
    score,
    tier: tierForScore(score),
  }));
  const axis = mode === 'dark' ? '#9DB2D6' : '#4A6FA5';
  const summary = data.map((d) => `${d.label}: ${d.score} (${t(`tier.${d.tier}`)})`).join(', ');

  return (
    <figure>
      <div className="h-28 w-full" role="img" aria-label={t('forecast.aria', { values: summary })}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -28 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: axis }} interval={0} />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: axis }} />
            <Bar dataKey="score" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.label} fill={TIER_HEX[mode][d.tier]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
