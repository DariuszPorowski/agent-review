export const policy = Object.freeze({
  routeId: 'cedar-point/returns',
  hub: 'cedar-point',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 5460,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 925,
});
