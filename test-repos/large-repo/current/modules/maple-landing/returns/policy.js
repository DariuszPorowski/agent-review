export const policy = Object.freeze({
  routeId: 'maple-landing/returns',
  hub: 'maple-landing',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 7440,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1200,
});
