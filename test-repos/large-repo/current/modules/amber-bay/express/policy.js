export const policy = Object.freeze({
  routeId: 'amber-bay/express',
  hub: 'amber-bay',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 3180,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 575,
});
