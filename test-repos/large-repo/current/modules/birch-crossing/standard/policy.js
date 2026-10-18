export const policy = Object.freeze({
  routeId: 'birch-crossing/standard',
  hub: 'birch-crossing',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 2880,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 525,
});
