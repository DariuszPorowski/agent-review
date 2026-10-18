export const policy = Object.freeze({
  routeId: 'granite-ridge/standard',
  hub: 'granite-ridge',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 3960,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 675,
});
