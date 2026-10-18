export const policy = Object.freeze({
  routeId: 'cedar-point/express',
  hub: 'cedar-point',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 3540,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 625,
});
