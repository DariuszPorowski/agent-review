export const policy = Object.freeze({
  routeId: 'granite-ridge/express',
  hub: 'granite-ridge',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 4440,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 750,
});
