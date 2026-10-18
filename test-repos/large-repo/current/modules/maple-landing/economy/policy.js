export const policy = Object.freeze({
  routeId: 'maple-landing/economy',
  hub: 'maple-landing',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 6960,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1125,
});
