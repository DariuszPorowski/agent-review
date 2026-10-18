export const policy = Object.freeze({
  routeId: 'elm-junction/express',
  hub: 'elm-junction',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 4080,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 700,
});
