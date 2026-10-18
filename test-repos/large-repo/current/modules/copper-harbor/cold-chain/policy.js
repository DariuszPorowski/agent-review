export const policy = Object.freeze({
  routeId: 'copper-harbor/cold-chain',
  hub: 'copper-harbor',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 4200,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 725,
});
