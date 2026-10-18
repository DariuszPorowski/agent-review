export const policy = Object.freeze({
  routeId: 'maple-landing/cold-chain',
  hub: 'maple-landing',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 6000,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 975,
});
