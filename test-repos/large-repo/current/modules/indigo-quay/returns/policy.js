export const policy = Object.freeze({
  routeId: 'indigo-quay/returns',
  hub: 'indigo-quay',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 6720,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1100,
});
