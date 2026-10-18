export const policy = Object.freeze({
  routeId: 'hazel-port/standard',
  hub: 'hazel-port',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 4140,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 700,
});
