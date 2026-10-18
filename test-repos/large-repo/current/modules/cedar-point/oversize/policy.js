export const policy = Object.freeze({
  routeId: 'cedar-point/oversize',
  hub: 'cedar-point',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 4500,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 775,
});
