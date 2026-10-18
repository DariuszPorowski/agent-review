export const policy = Object.freeze({
  routeId: 'fern-valley/economy',
  hub: 'fern-valley',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 5700,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 950,
});
