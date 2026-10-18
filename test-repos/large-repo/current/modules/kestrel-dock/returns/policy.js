export const policy = Object.freeze({
  routeId: 'kestrel-dock/returns',
  hub: 'kestrel-dock',
  service: 'returns',
  schemaVersion: 2,
  serviceTier: 'reverse',
  transitSeconds: 7080,
  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },
  maxWeightKg: 40,
  maxParcels: 12,
  baseCents: 1150,
});
