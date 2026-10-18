export const policy = Object.freeze({
  routeId: 'granite-ridge/oversize',
  hub: 'granite-ridge',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 5400,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 900,
});
