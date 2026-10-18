export const policy = Object.freeze({
  routeId: 'birch-crossing/returns',
  hub: 'birch-crossing',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 5280,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 900,
});
