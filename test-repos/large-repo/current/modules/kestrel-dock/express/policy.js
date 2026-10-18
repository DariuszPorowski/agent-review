export const policy = Object.freeze({
  routeId: 'kestrel-dock/express',
  hub: 'kestrel-dock',
  service: 'express',
  schemaVersion: 2,
  serviceTier: 'priority',
  transitSeconds: 5160,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 850,
});
