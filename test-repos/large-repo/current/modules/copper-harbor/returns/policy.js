export const policy = Object.freeze({
  routeId: 'copper-harbor/returns',
  hub: 'copper-harbor',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 5640,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 950,
});
