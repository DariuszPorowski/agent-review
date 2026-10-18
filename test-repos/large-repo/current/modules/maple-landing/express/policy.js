export const policy = Object.freeze({
  routeId: 'maple-landing/express',
  hub: 'maple-landing',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 5520,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 900,
});
