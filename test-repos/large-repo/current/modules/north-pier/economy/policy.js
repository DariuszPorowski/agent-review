export const policy = Object.freeze({
  routeId: 'north-pier/economy',
  hub: 'north-pier',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 7140,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1150,
});
