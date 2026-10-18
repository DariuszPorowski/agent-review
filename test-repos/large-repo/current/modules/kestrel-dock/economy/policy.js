export const policy = Object.freeze({
  routeId: 'kestrel-dock/economy',
  hub: 'kestrel-dock',
  service: 'economy',
  schemaVersion: 2,
  serviceTier: 'deferred',
  transitSeconds: 6600,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1075,
});
