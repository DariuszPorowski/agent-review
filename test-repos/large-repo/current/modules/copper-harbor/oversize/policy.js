export const policy = Object.freeze({
  routeId: 'copper-harbor/oversize',
  hub: 'copper-harbor',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 4680,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 800,
});
