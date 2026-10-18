export const policy = Object.freeze({
  routeId: 'indigo-quay/economy',
  hub: 'indigo-quay',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 6240,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1025,
});
