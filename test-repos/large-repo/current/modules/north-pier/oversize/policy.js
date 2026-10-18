export const policy = Object.freeze({
  routeId: 'north-pier/oversize',
  hub: 'north-pier',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 6660,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 1075,
});
