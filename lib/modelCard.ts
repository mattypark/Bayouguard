/* The model's published numbers, in one place. Update here when the backend
 * retrains; the About page reads nothing else. */

export const MODEL_CARD = {
  kind: 'Random forest classifier (scikit-learn)',
  trainingReadings: 430_000,
  inputs: ['current_level', 'rate_of_rise', 'level_1h_ago', 'level_3h_ago', 'level_6h_ago', 'hour', 'day_of_week'],
  accuracy: 90.35, // % on held-out data
  rocAuc: 97.99, // %
  recallHighCritical: 96.5, // % of HIGH/CRITICAL conditions caught
  recallNormal: 90.0, // % of normal conditions correctly called normal
  leakedAccuracy: 100, // what the leaky first version reported
} as const;
