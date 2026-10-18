export const policy = Object.freeze({
  routeId: 'juniper-falls/oversize',
  hub: 'juniper-falls',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 5940,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 975,
});
