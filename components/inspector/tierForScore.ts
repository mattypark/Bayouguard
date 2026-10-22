import type { Tier } from '@/lib/types';

/** Score (0-100) -> display tier, matching the estimate's score bands. */
export function tierForScore(score: number): Tier {
  if (score >= 92) return 'CRITICAL';
  if (score >= 75) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}
