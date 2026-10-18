export const policy = Object.freeze({
  routeId: 'amber-bay/returns',
  hub: 'amber-bay',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 5100,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 875,
});
