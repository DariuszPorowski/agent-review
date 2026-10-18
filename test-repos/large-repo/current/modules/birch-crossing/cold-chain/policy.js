export const policy = Object.freeze({
  routeId: 'birch-crossing/cold-chain',
  hub: 'birch-crossing',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 3840,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 675,
});
