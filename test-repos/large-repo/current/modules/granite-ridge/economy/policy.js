export const policy = Object.freeze({
  routeId: 'granite-ridge/economy',
  hub: 'granite-ridge',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 5880,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 975,
});
