export const policy = Object.freeze({
  routeId: 'elm-junction/standard',
  hub: 'elm-junction',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 3600,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 625,
});
