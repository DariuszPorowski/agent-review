export const policy = Object.freeze({
  routeId: 'fern-valley/express',
  hub: 'fern-valley',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 4260,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 725,
});
