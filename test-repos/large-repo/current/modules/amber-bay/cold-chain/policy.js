export const policy = Object.freeze({
  routeId: 'amber-bay/cold-chain',
  hub: 'amber-bay',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 3660,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 650,
});
