export const policy = Object.freeze({
  routeId: 'juniper-falls/express',
  hub: 'juniper-falls',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 4980,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 825,
});
