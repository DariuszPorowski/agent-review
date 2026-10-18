export const policy = Object.freeze({
  routeId: 'granite-ridge/cold-chain',
  hub: 'granite-ridge',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 4920,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 825,
});
