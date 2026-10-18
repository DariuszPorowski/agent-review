export const policy = Object.freeze({
  routeId: 'copper-harbor/economy',
  hub: 'copper-harbor',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 5160,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 875,
});
