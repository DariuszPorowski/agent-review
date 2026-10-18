export const policy = Object.freeze({
  routeId: 'maple-landing/oversize',
  hub: 'maple-landing',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 6480,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 1050,
});
