export const policy = Object.freeze({
  routeId: 'north-pier/express',
  hub: 'north-pier',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 5700,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 925,
});
