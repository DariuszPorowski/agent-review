export const policy = Object.freeze({
  routeId: 'larch-grove/cold-chain',
  hub: 'larch-grove',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 5820,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 950,
});
