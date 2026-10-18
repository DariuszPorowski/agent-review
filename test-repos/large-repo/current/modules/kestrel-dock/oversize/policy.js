export const policy = Object.freeze({
  routeId: 'kestrel-dock/oversize',
  hub: 'kestrel-dock',
  service: 'oversize',
  schemaVersion: 2,
  serviceTier: 'freight',
  transitSeconds: 6120,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 120,
  maxParcels: 12,
  baseCents: 1000,
});
