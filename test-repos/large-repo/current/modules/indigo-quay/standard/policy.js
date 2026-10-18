export const policy = Object.freeze({
  routeId: 'indigo-quay/standard',
  hub: 'indigo-quay',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 4320,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 725,
});
