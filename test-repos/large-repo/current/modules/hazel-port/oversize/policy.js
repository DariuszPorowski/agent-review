export const policy = Object.freeze({
  routeId: 'hazel-port/oversize',
  hub: 'hazel-port',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 5580,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 925,
});
