export const policy = Object.freeze({
  routeId: 'juniper-falls/returns',
  hub: 'juniper-falls',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 6900,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1125,
});
