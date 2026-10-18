export const policy = Object.freeze({
  routeId: 'maple-landing/standard',
  hub: 'maple-landing',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 5040,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 825,
});
