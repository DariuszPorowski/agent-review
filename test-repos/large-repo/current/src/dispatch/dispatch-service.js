import { getRoute } from '../routing/registry.js';
import { resolveRetryPolicy } from '../retry/resolve-policy.js';
import { runWithRetry } from '../retry/run-with-retry.js';

export async function dispatchShipment({ routeId, shipment, transport, retryPolicy, sleep }) {
  const route = getRoute(routeId);
  const policy = resolveRetryPolicy(route.policy, retryPolicy);
  return runWithRetry(() => route.dispatch(shipment, transport), policy, sleep);
}
