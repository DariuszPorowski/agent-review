export const policy = Object.freeze({
  routeId: 'elm-junction/economy',
  hub: 'elm-junction',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 5520,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 925,
});
