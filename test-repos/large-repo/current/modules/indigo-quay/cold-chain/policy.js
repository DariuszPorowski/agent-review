export const policy = Object.freeze({
  routeId: 'indigo-quay/cold-chain',
  hub: 'indigo-quay',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 5280,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 875,
});
