export const policy = Object.freeze({
  routeId: 'elm-junction/oversize',
  hub: 'elm-junction',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 5040,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 850,
});
