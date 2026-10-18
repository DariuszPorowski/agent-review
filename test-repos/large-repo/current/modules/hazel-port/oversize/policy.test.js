import test from 'node:test';
import assert from 'node:assert/strict';
import * as route from './index.js';

test('hazel-port/oversize: policy schema 2', () => {
  assert.equal(route.policy.routeId, 'hazel-port/oversize');
  assert.equal(route.policy.schemaVersion, 2);
  assert.equal(route.policy.transitSeconds, 5580);
  assert.equal(route.policy.reliability.retryPolicy.maxAttempts, 3);
  assert.equal(route.serviceTier, 'freight');
  assert.equal(route.policy.maxParcels, 12);
});

test('hazel-port/oversize: adapter contract 2', async () => {
  const shipment = { id: 'module-probe', weightKg: 2, parcels: 1 };
  let sent;
  const result = await route.dispatch(shipment, {
    send: async (payload) => { sent = payload; return { accepted: true }; },
  });
  assert.equal(result.accepted, true);
  assert.equal(sent.routeId, route.routeId);
  assert.equal(sent.transitSeconds, 5580);
  assert.equal(sent.schemaVersion, 2);
});

test('hazel-port/oversize: rejects overweight shipments (routing v2)', () => {
  assert.throws(() => route.buildPayload({ id: 'heavy', weightKg: 121, parcels: 1 }),
    /weight limit exceeded/);
  assert.throws(() => route.buildPayload({ id: 'too-many', weightKg: 1, parcels: 13 }), /parcel limit exceeded/);
});
