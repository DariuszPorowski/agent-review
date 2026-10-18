export const policy = Object.freeze({
  routeId: 'driftwood/express',
  hub: 'driftwood',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 3900,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 675,
});
