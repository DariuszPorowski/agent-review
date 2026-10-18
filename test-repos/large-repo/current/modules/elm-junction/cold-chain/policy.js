export const policy = Object.freeze({
  routeId: 'elm-junction/cold-chain',
  hub: 'elm-junction',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 4560,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 775,
});
