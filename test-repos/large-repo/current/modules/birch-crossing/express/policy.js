export const policy = Object.freeze({
  routeId: 'birch-crossing/express',
  hub: 'birch-crossing',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 3360,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 600,
});
