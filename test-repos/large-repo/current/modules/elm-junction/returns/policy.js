export const policy = Object.freeze({
  routeId: 'elm-junction/returns',
  hub: 'elm-junction',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 6000,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1000,
});
