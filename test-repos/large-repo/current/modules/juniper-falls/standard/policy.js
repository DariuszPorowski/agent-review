export const policy = Object.freeze({
  routeId: 'juniper-falls/standard',
  hub: 'juniper-falls',
  service: 'standard',
  schemaVersion: 2,
  serviceTier: 'standard',
  transitSeconds: 4500,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 750,
});
