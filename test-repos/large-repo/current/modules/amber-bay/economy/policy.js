export const policy = Object.freeze({
  routeId: 'amber-bay/economy',
  hub: 'amber-bay',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 4620,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 800,
});
