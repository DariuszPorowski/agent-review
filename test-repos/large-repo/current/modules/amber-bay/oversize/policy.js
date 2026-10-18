export const policy = Object.freeze({
  routeId: 'amber-bay/oversize',
  hub: 'amber-bay',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 4140,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 725,
});
