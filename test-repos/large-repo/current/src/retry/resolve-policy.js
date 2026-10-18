import { validateRetryPolicy } from '../shared/validation.js';
import { DEFAULT_RETRY_POLICY } from './defaults.js';

export function resolveRetryPolicy(routePolicy, shipmentOverride) {
  const selected = shipmentOverride ?? routePolicy.retryPolicy;
  return validateRetryPolicy(selected ?? { ...DEFAULT_RETRY_POLICY, maxAttempts: 1 });
}
