export const policy = Object.freeze({
  routeId: 'granite-ridge/returns',
  hub: 'granite-ridge',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 6360,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1050,
});
