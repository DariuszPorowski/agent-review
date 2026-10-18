export const policy = Object.freeze({
  routeId: 'hazel-port/cold-chain',
  hub: 'hazel-port',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 5100,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 850,
});
