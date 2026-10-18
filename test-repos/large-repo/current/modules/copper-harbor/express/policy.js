export const policy = Object.freeze({
  routeId: 'copper-harbor/express',
  hub: 'copper-harbor',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 3720,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 650,
});
