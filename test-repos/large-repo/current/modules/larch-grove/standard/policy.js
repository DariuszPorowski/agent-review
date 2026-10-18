export const policy = Object.freeze({
  routeId: 'larch-grove/standard',
  hub: 'larch-grove',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 4860,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 800,
});
