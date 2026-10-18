import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchShipment } from '../src/dispatch/dispatch-service.js';
import { createMemoryTransport } from '../src/transport/memory-transport.js';
import { noWait, sampleShipment } from './helpers.js';

test('retry boundary: omitted override inherits three attempts and recovers after two transient failures', async () => {
  const transport = createMemoryTransport({ transientFailures: 2 });
  await assert.doesNotReject(async () => {
    const receipt = await dispatchShipment({
      routeId: 'amber-bay/standard',
      shipment: sampleShipment,
      transport,
      sleep: noWait,
    });
    assert.equal(receipt.accepted, true);
  }, 'REGRESSION CHECK: an omitted override must preserve the route retry budget');
  assert.equal(transport.calls.length, 3);
});

test('retry boundary: explicit override still recovers', async () => {
  const transport = createMemoryTransport({ transientFailures: 2 });
  const receipt = await dispatchShipment({
    routeId: 'amber-bay/standard',
    shipment: sampleShipment,
    transport,
    retryPolicy: { maxAttempts: 3, delayMs: 0 },
    sleep: noWait,
  });
  assert.equal(receipt.accepted, true);
  assert.equal(transport.calls.length, 3);
});

test('retry boundary: permanent failures are not retried', async () => {
  const transport = createMemoryTransport({ permanentFailure: true });
  await assert.rejects(() => dispatchShipment({
    routeId: 'amber-bay/standard',
    shipment: sampleShipment,
    transport,
    retryPolicy: { maxAttempts: 3, delayMs: 0 },
    sleep: noWait,
  }), /synthetic route closed/);
  assert.equal(transport.calls.length, 1);
});

test('retry boundary: success without a retry remains successful', async () => {
  const transport = createMemoryTransport();
  const receipt = await dispatchShipment({
    routeId: 'birch-crossing/express',
    shipment: sampleShipment,
    transport,
    sleep: noWait,
  });
  assert.equal(receipt.accepted, true);
  assert.equal(transport.calls.length, 1);
});
