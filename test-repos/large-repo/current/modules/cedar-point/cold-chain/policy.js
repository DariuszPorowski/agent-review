export const policy = Object.freeze({
  routeId: 'cedar-point/cold-chain',
  hub: 'cedar-point',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 4020,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 700,
});
