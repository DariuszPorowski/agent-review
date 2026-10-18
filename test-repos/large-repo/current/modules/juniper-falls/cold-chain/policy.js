export const policy = Object.freeze({
  routeId: 'juniper-falls/cold-chain',
  hub: 'juniper-falls',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 5460,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 900,
});
