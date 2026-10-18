export const policy = Object.freeze({
  routeId: 'indigo-quay/express',
  hub: 'indigo-quay',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 4800,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 800,
});
