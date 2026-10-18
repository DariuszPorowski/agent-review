export const policy = Object.freeze({
  routeId: 'amber-bay/standard',
  hub: 'amber-bay',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 2700,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 500,
});
