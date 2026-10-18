export const policy = Object.freeze({
  routeId: 'kestrel-dock/standard',
  hub: 'kestrel-dock',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 4680,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 775,
});
