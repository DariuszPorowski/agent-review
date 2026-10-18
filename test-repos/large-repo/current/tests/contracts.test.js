import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getRoute, listRoutes, ROUTE_SCHEMA_VERSION } from '../src/routing/registry.js';
import { validateRetryPolicy, validateDurationSeconds, validateShipment } from '../src/shared/validation.js';
import { resolveRetryPolicy } from '../src/retry/resolve-policy.js';
import { sampleShipment } from './helpers.js';
import { findTerminalException, resolveTerminalException, TERMINAL_EXCEPTIONS } from '../src/routing/exception-rules.js';

test('catalog: 90 unique routes agree with the generated lock', () => {
  const routes = listRoutes();
  const lock = JSON.parse(readFileSync(new URL('../.generated/catalog-lock.json', import.meta.url), 'utf8'));
  assert.equal(routes.length, 90);
  assert.equal(new Set(routes.map((route) => route.routeId)).size, 90);
  assert.equal(lock.modules.length, 90);
  assert.equal(lock.lockVersion, ROUTE_SCHEMA_VERSION);
  for (const route of routes) {
    const manifest = JSON.parse(readFileSync(new URL('../modules/' + route.routeId + '/manifest.json', import.meta.url), 'utf8'));
    const snapshot = JSON.parse(readFileSync(new URL('../.generated/routes/' + route.routeId.replace('/', '--') + '.json', import.meta.url), 'utf8'));
    assert.equal(manifest.routeId, route.routeId);
    assert.equal(manifest.schemaVersion, ROUTE_SCHEMA_VERSION);
    assert.equal(snapshot.schemaVersion, ROUTE_SCHEMA_VERSION);
    assert.equal(snapshot.quote.baseCents, route.policy.baseCents);
    assert.equal(snapshot.duration.value, route.policy.transitSeconds);
    assert.equal(snapshot.duration.unit, 'seconds');
  }
});

test('catalog: unknown route is rejected', () => {
  assert.throws(() => getRoute('missing/standard'), /Unknown synthetic route/);
});

test('validation: retry shape accepts one attempt but rejects missing fields', () => {
  assert.deepEqual(validateRetryPolicy({ maxAttempts: 1, delayMs: 0 }), { maxAttempts: 1, delayMs: 0 });
  assert.throws(() => validateRetryPolicy({}), /maxAttempts/);
  assert.throws(() => validateRetryPolicy({ maxAttempts: 3, delayMs: -1 }), /delayMs/);
  assert.throws(() => resolveRetryPolicy({}, { maxAttempts: 0, delayMs: 0 }), /maxAttempts/);
});

test('validation: shipment and duration boundaries remain enforced', () => {
  assert.equal(validateShipment(sampleShipment), sampleShipment);
  assert.throws(() => validateShipment({ ...sampleShipment, weightKg: 0 }), /weightKg/);
  assert.throws(() => validateDurationSeconds(100000), /one day/);
  assert.equal(validateDurationSeconds(2700), 2700);
});

test('oversized source: table lookups and weekday cutoff are preserved', () => {
  assert.equal(TERMINAL_EXCEPTIONS.length, 1800);
  assert.equal(findTerminalException('terminal-1800').id, 'terminal-1800');
  assert.equal(findTerminalException('not-present'), null);
  assert.deepEqual(resolveTerminalException({ ...sampleShipment, coldChain: true }, { minuteOfDay: 1100 }),
    { code: 'cold-chain-cutoff', deferSeconds: 3600 });
  assert.equal(resolveTerminalException(sampleShipment, { minuteOfDay: 600 }), null);
});

test('oversized source tail: weekend cold-chain deferral is an intended new feature', () => {
  assert.deepEqual(resolveTerminalException({ ...sampleShipment, coldChain: true }, {
    minuteOfDay: 600, weekend: true,
  }), { code: 'weekend-cold-chain', deferSeconds: 7200 });
});
