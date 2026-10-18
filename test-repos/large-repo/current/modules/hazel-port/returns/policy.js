export const policy = Object.freeze({
  routeId: 'hazel-port/returns',
  hub: 'hazel-port',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 6540,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1075,
});
