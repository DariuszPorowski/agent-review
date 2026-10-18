export const policy = Object.freeze({
  routeId: 'driftwood/standard',
  hub: 'driftwood',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 3420,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 600,
});
