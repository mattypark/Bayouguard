// Trend classification shared by UI + outlook. Thresholds in ft/hr; HCFWS noise
// floor sits well under 0.05.
export type TrendState = 'rising' | 'falling' | 'steady';

export function classifyTrend(trend: number): TrendState {
  if (trend >= 0.05) return 'rising';
  if (trend <= -0.05) return 'falling';
  return 'steady';
}
