export const policy = Object.freeze({
  routeId: 'cedar-point/standard',
  hub: 'cedar-point',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 3060,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 550,
});
