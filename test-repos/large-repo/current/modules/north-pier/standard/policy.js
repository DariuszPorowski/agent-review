export const policy = Object.freeze({
  routeId: 'north-pier/standard',
  hub: 'north-pier',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 5220,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 850,
});
