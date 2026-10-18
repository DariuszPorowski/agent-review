export const policy = Object.freeze({
  routeId: 'larch-grove/oversize',
  hub: 'larch-grove',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 6300,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 1025,
});
