export const policy = Object.freeze({
  routeId: 'juniper-falls/economy',
  hub: 'juniper-falls',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 6420,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1050,
});
