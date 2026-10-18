export const policy = Object.freeze({
  routeId: 'indigo-quay/oversize',
  hub: 'indigo-quay',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 5760,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 950,
});
