export const policy = Object.freeze({
  routeId: 'kestrel-dock/cold-chain',
  hub: 'kestrel-dock',
  service: 'cold-chain',
  schemaVersion: 2,
  serviceTier: 'controlled',
  transitSeconds: 5640,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 925,
});
