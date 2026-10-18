export const policy = Object.freeze({
  routeId: 'north-pier/cold-chain',
  hub: 'north-pier',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 6180,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1000,
});
