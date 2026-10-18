export const policy = Object.freeze({
  routeId: 'fern-valley/cold-chain',
  hub: 'fern-valley',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 4740,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 800,
});
