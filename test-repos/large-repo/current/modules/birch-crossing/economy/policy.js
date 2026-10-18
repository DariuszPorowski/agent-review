export const policy = Object.freeze({
  routeId: 'birch-crossing/economy',
  hub: 'birch-crossing',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 4800,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 825,
});
