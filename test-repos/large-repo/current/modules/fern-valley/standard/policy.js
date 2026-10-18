export const policy = Object.freeze({
  routeId: 'fern-valley/standard',
  hub: 'fern-valley',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 3780,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 650,
});
