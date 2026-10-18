export const policy = Object.freeze({
  routeId: 'fern-valley/oversize',
  hub: 'fern-valley',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 5220,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 875,
});
