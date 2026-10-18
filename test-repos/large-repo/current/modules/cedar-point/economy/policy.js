export const policy = Object.freeze({
  routeId: 'cedar-point/economy',
  hub: 'cedar-point',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 4980,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 850,
});
