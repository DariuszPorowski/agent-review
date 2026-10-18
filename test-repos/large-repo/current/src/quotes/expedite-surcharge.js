import { validateDurationSeconds } from '../shared/validation.js';

export function calculateExpediteSurcharge({ leadTimeSeconds, deadlineSeconds, baseCents }) {
  validateDurationSeconds(deadlineSeconds, 'deadlineSeconds');
  if (!Number.isFinite(leadTimeSeconds) || leadTimeSeconds <= 0) {
    throw new RangeError('leadTimeSeconds must be positive');
  }
  if (!Number.isInteger(baseCents) || baseCents < 0) {
    throw new RangeError('baseCents must be non-negative integer cents');
  }
  return leadTimeSeconds > deadlineSeconds ? Math.ceil(baseCents * 0.15) : 0;
}
