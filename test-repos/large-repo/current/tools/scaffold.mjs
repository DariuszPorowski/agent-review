import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stageIndex = process.argv.indexOf('--stage');
const stage = process.argv[stageIndex + 1];
if (stageIndex < 0 || !['baseline', 'head'].includes(stage)) {
  throw new Error('Usage: node tools/scaffold.mjs --stage baseline|head');
}
const head = stage === 'head';
const version = head ? '0.2.0' : '0.1.0';
let written = 0;
function write(path, content) {
  const destination = resolve(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  written++;
}
function json(path, value) {
  write(path, JSON.stringify(value, null, 2));
}

const hubs = [
  'amber-bay', 'birch-crossing', 'cedar-point', 'copper-harbor', 'driftwood',
  'elm-junction', 'fern-valley', 'granite-ridge', 'hazel-port', 'indigo-quay',
  'juniper-falls', 'kestrel-dock', 'larch-grove', 'maple-landing', 'north-pier',
];
const services = ['standard', 'express', 'cold-chain', 'oversize', 'economy', 'returns'];
const routes = hubs.flatMap((hub, hubIndex) => services.map((service, serviceIndex) => ({
  hub,
  service,
  id: `${hub}/${service}`,
  transitMinutes: 45 + hubIndex * 3 + serviceIndex * 8,
  maxWeightKg: service === 'oversize' ? 120 : 40,
  baseCents: 500 + hubIndex * 25 + serviceIndex * 75,
  serviceTier: ['standard', 'priority', 'controlled', 'freight', 'deferred', 'reverse'][serviceIndex],
})));

write('.gitignore', 'node_modules/\n.validation/\n*.log\n');
write('.gitattributes', '* text=auto eol=lf\n');
json('package.json', {
  name: 'synthetic-parcel-flow',
  version,
  private: true,
  type: 'module',
  description: 'Synthetic dependency-free parcel routing fixture for large-change reviews',
  engines: { node: '>=20' },
  scripts: {
    test: 'node --test tests/route-modules.test.js tests/retry-boundary.test.js tests/quote-boundary.test.js tests/contracts.test.js',
    'test:routes': 'node --test tests/route-modules.test.js',
    'test:regressions': 'node --test tests/retry-boundary.test.js tests/quote-boundary.test.js',
    'test:contracts': 'node --test tests/contracts.test.js',
    inspect: 'node tools/inspect-fixture.mjs',
  },
});
json('package-lock.json', {
  name: 'synthetic-parcel-flow',
  version,
  lockfileVersion: 3,
  requires: true,
  packages: { '': { name: 'synthetic-parcel-flow', version, engines: { node: '>=20' } } },
});
write('AGENTS.md', `# Parcel Flow contributor rules

- All code and data here are synthetic; do not add dependencies or network access.
- Preserve public dispatch and quote behavior when migrating route policy schemas.
- Review caller/callee contracts, defaults, retry attempt counts, and duration units.
- Run \`npm test\`; do not weaken an expectation simply to accommodate a migration.
- Nested AGENTS.md files narrow these rules for their own directories.
- Generated snapshots are evidence of source changes, not authoritative business logic.
`);
write('modules/AGENTS.md', `# Route-module rules

- A module owns one hub/service pair and exports policy, payload construction, and dispatch.
- Keep route IDs stable across schema migrations.
- Retry settings must still reach the central dispatch service when callers omit overrides.
- Contract tests here may evolve with field names; business-behavior tests in tests/ must remain.
- Weight is kilograms, money is integer cents, and duration field names must state units.
`);
write('src/AGENTS.md', `# Runtime rules

- Keep validation centralized in shared/validation.js and call it at public boundaries.
- No real I/O: transport and sleep are injected, deterministic functions.
- Preserve behavior across schema changes and inspect consumers, not only migrated producers.
`);
write('src/retry/AGENTS.md', `# Retry rules

- Omitted shipment overrides inherit the route retry policy, then DEFAULT_RETRY_POLICY.
- maxAttempts counts the first attempt; a value of 3 allows two retries.
- Never turn an omitted policy into a silent single-attempt policy.
- Only errors explicitly marked retryable may be retried.
- shared/validation.js validates shape and ranges, not whether inheritance was preserved.
`);
write('src/quotes/AGENTS.md', `# Quote rules

- The quote API and surcharge calculator consume seconds, not minutes or milliseconds.
- A shipment that meets its deadline has no expedite surcharge.
- When an estimator changes its output units, update every conversion at its call sites.
- All monetary amounts are non-negative integer cents.
`);
write('src/routing/AGENTS.md', `# Routing rules

- exception-rules.js is intentionally large source, not a generated snapshot to skip wholesale.
- Its table dominates the diff. Inspect executable functions after the table, including the tail.
- Weekend cold-chain handling is an intended feature; preserve weekday cutoff behavior.
`);
write('tests/AGENTS.md', `# Test rules

- Business-boundary tests assert stable behavior even when local schema tests change.
- Use node:test, built-in assertions, synthetic shipments, and injected no-wait sleep.
- Do not change expected results to conceal a correctness regression.
`);
write('.generated/AGENTS.md', `# Generated-data rules

- These files and catalog-lock.json are deterministic local snapshots; no third-party content.
- Prefer checking source policies and schema consistency over reviewing every repeated record.
- Do not confuse the catalog lock with the dependency-free npm package-lock.json.
- tools/scaffold.mjs recreates owned files; it will overwrite edits to those fixture files.
`);

write('src/shared/validation.js', `export function validateShipment(shipment) {
  if (!shipment || typeof shipment.id !== 'string' || shipment.id.length === 0) {
    throw new TypeError('shipment.id must be a non-empty string');
  }
  if (!Number.isFinite(shipment.weightKg) || shipment.weightKg <= 0) {
    throw new RangeError('shipment.weightKg must be positive kilograms');
  }
  if (!Number.isInteger(shipment.parcels) || shipment.parcels < 1) {
    throw new RangeError('shipment.parcels must be a positive integer');
  }
  return shipment;
}

export function validateRetryPolicy(policy) {
  if (!policy || !Number.isInteger(policy.maxAttempts) ||
      policy.maxAttempts < 1 || policy.maxAttempts > 8) {
    throw new RangeError('retry.maxAttempts must be an integer between 1 and 8');
  }
  if (!Number.isInteger(policy.delayMs) || policy.delayMs < 0 || policy.delayMs > 60000) {
    throw new RangeError('retry.delayMs must be an integer between 0 and 60000');
  }
  return policy;
}

export function validateDurationSeconds(value, label = 'durationSeconds') {
  if (!Number.isFinite(value) || value <= 0 || value > 86400) {
    throw new RangeError(label + ' must be positive seconds, at most one day');
  }
  return value;
}
`);
write('src/retry/defaults.js', `export const DEFAULT_RETRY_POLICY = Object.freeze({
  maxAttempts: 3,
  delayMs: 10,
});
`);
write('src/retry/resolve-policy.js', `import { validateRetryPolicy } from '../shared/validation.js';
import { DEFAULT_RETRY_POLICY } from './defaults.js';

export function resolveRetryPolicy(routePolicy, shipmentOverride) {
  const selected = shipmentOverride ?? routePolicy.retryPolicy;
  return validateRetryPolicy(selected ?? ${head ? '{ ...DEFAULT_RETRY_POLICY, maxAttempts: 1 }' : 'DEFAULT_RETRY_POLICY'});
}
`);
write('src/retry/run-with-retry.js', `import { validateRetryPolicy } from '../shared/validation.js';

const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

export async function runWithRetry(operation, policy, sleep = wait) {
  validateRetryPolicy(policy);
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (error.retryable !== true || attempt === policy.maxAttempts) throw error;
      await sleep(policy.delayMs);
    }
  }
}
`);
write('src/transport/memory-transport.js', `export function createMemoryTransport({ transientFailures = 0, permanentFailure = false } = {}) {
  const calls = [];
  return {
    calls,
    async send(payload) {
      calls.push(payload);
      if (permanentFailure || calls.length <= transientFailures) {
        const error = new Error(permanentFailure ? 'synthetic route closed' : 'synthetic transient depot delay');
        error.retryable = !permanentFailure;
        throw error;
      }
      return { receipt: 'receipt-' + payload.shipmentId, routeId: payload.routeId, accepted: true };
    },
  };
}
`);
write('src/dispatch/dispatch-service.js', `import { getRoute } from '../routing/registry.js';
import { resolveRetryPolicy } from '../retry/resolve-policy.js';
import { runWithRetry } from '../retry/run-with-retry.js';

export async function dispatchShipment({ routeId, shipment, transport, retryPolicy, sleep }) {
  const route = getRoute(routeId);
  const policy = resolveRetryPolicy(route.policy, retryPolicy);
  return runWithRetry(() => route.dispatch(shipment, transport), policy, sleep);
}
`);
write('src/scheduling/lead-time.js', `import { validateShipment } from '../shared/validation.js';

export function ${head ? 'estimateLeadTime' : 'estimateLeadTimeMinutes'}(routePolicy, shipment) {
  validateShipment(shipment);
  const additionalParcels = Math.max(0, shipment.parcels - 1);
  return routePolicy.${head ? 'transitSeconds + additionalParcels * 120' : 'transitMinutes + additionalParcels * 2'};
}
`);
write('src/quotes/expedite-surcharge.js', `import { validateDurationSeconds } from '../shared/validation.js';

export function calculateExpediteSurcharge({ leadTimeSeconds, deadlineSeconds, baseCents }) {
  validateDurationSeconds(deadlineSeconds, 'deadlineSeconds');
  if (!Number.isFinite(leadTimeSeconds) || leadTimeSeconds <= 0) {
    throw new RangeError('leadTimeSeconds must be positive');
  }
  if (!Number.isInteger(baseCents) || baseCents < 0) {
    throw new RangeError('baseCents must be non-negative integer cents');
  }
  return leadTimeSeconds > deadlineSeconds ? Math.ceil(baseCents * 0.15) : 0;
}
`);
write('src/quotes/quote-service.js', `import { getRoute } from '../routing/registry.js';
import { ${head ? 'estimateLeadTime' : 'estimateLeadTimeMinutes'} } from '../scheduling/lead-time.js';
import { calculateExpediteSurcharge } from './expedite-surcharge.js';

export function quoteShipment({ routeId, shipment, deadlineSeconds }) {
  const route = getRoute(routeId);
  const leadTimeSeconds = ${head ? 'estimateLeadTime' : 'estimateLeadTimeMinutes'}(route.policy, shipment) * 60;
  const baseCents = route.policy.baseCents;
  const surchargeCents = calculateExpediteSurcharge({ leadTimeSeconds, deadlineSeconds, baseCents });
  return { routeId, leadTimeSeconds, baseCents, surchargeCents, totalCents: baseCents + surchargeCents };
}
`);

const importLines = routes.map((route, index) =>
  `import * as route${index} from '../../modules/${route.id}/index.js';`);
write('src/routing/registry.js', `${importLines.join('\n')}

export const ROUTE_SCHEMA_VERSION = ${head ? 2 : 1};
const routes = new Map([${routes.map((_, index) => `route${index}`).join(', ')}]
  .map((route) => [route.routeId, route]));

export function getRoute(routeId) {
  const route = routes.get(routeId);
  if (!route) throw new RangeError('Unknown synthetic route: ' + routeId);
  return route;
}

export function listRoutes() {
  return [...routes.values()];
}
`);

for (const route of routes) {
  const path = `modules/${route.id}`;
  write(`${path}/policy.js`, `export const policy = Object.freeze({
  routeId: '${route.id}',
  hub: '${route.hub}',
  service: '${route.service}',
  schemaVersion: ${head ? 2 : 1},
${head
    ? `  serviceTier: '${route.serviceTier}',\n  transitSeconds: ${route.transitMinutes * 60},\n  reliability: { retryPolicy: { maxAttempts: 3, delayMs: 10 } },`
    : `  transitMinutes: ${route.transitMinutes},\n  retryPolicy: { maxAttempts: 3, delayMs: 10 },`}
  maxWeightKg: ${route.maxWeightKg},
${head ? '  maxParcels: 12,\n' : ''}  baseCents: ${route.baseCents},
});
`);
  write(`${path}/adapter.js`, `import { validateShipment } from '../../../src/shared/validation.js';
import { policy } from './policy.js';

export function buildPayload(shipment) {
  validateShipment(shipment);
  if (shipment.weightKg > policy.maxWeightKg) throw new RangeError('route weight limit exceeded');
${head ? "  if (shipment.parcels > policy.maxParcels) throw new RangeError('route parcel limit exceeded');\n" : ''}  return {
    routeId: policy.routeId,
    shipmentId: shipment.id,
    weightKg: shipment.weightKg,
    parcels: shipment.parcels,
    schemaVersion: ${head ? 2 : 1},
    ${head ? 'transitSeconds: policy.transitSeconds' : 'transitMinutes: policy.transitMinutes'},
${head ? '    serviceTier: policy.serviceTier,\n' : ''}  };
}

export async function dispatch(shipment, transport) {
  return transport.send(buildPayload(shipment));
}
`);
  write(`${path}/index.js`, `import { policy } from './policy.js';

export { policy };
export { buildPayload, dispatch } from './adapter.js';
export const routeId = policy.routeId;
export const isColdChainRoute = policy.service === 'cold-chain';
${head ? 'export const serviceTier = policy.serviceTier;\nexport const routingVersion = 2;' : 'export const routingVersion = 1;'}
`);
  write(`${path}/policy.test.js`, `import test from 'node:test';
import assert from 'node:assert/strict';
import * as route from './index.js';

test('${route.id}: policy schema ${head ? 2 : 1}', () => {
  assert.equal(route.policy.routeId, '${route.id}');
  assert.equal(route.policy.schemaVersion, ${head ? 2 : 1});
  assert.equal(route.policy.${head ? 'transitSeconds' : 'transitMinutes'}, ${head ? route.transitMinutes * 60 : route.transitMinutes});
  assert.equal(route.policy.${head ? 'reliability.retryPolicy' : 'retryPolicy'}.maxAttempts, 3);
${head ? `  assert.equal(route.serviceTier, '${route.serviceTier}');\n  assert.equal(route.policy.maxParcels, 12);\n` : ''}});

test('${route.id}: adapter contract ${head ? 2 : 1}', async () => {
  const shipment = { id: 'module-probe', weightKg: 2, parcels: 1 };
  let sent;
  const result = await route.dispatch(shipment, {
    send: async (payload) => { sent = payload; return { accepted: true }; },
  });
  assert.equal(result.accepted, true);
  assert.equal(sent.routeId, route.routeId);
  assert.equal(sent.${head ? 'transitSeconds' : 'transitMinutes'}, ${head ? route.transitMinutes * 60 : route.transitMinutes});
  assert.equal(sent.schemaVersion, ${head ? 2 : 1});
});

test('${route.id}: rejects overweight shipments (routing v${head ? 2 : 1})', () => {
  assert.throws(() => route.buildPayload({ id: 'heavy', weightKg: ${route.maxWeightKg + 1}, parcels: 1 }),
    /weight limit exceeded/);
${head ? "  assert.throws(() => route.buildPayload({ id: 'too-many', weightKg: 1, parcels: 13 }), /parcel limit exceeded/);\n" : ''}});
`);
  write(`${path}/README.md`, `# ${route.hub} / ${route.service}

Synthetic local route adapter owned by the ${route.hub} operations module.

| Contract | Value |
| --- | --- |
| Schema | ${head ? 2 : 1} |
| Transit | ${head ? `${route.transitMinutes * 60} seconds` : `${route.transitMinutes} minutes`} |
| Weight ceiling | ${route.maxWeightKg} kg |
| Base quote | ${route.baseCents} cents |
| Retry policy | ${head ? 'reliability.retryPolicy' : 'retryPolicy'}: 3 total attempts, 10 ms delay |
${head ? `| Service tier | ${route.serviceTier} |\n| Parcel ceiling | 12 |\n` : ''}
Exports are in index.js; buildPayload validates local limits before calling injected transport.
Run \`npm run test:routes\` from the root. Boundary behavior is covered in tests/.
`);
  json(`${path}/manifest.json`, {
    routeId: route.id,
    owner: `ops-${route.hub}`,
    entrypoint: 'index.js',
    schemaVersion: head ? 2 : 1,
    durationUnit: head ? 'seconds' : 'minutes',
    policyPath: head ? 'reliability.retryPolicy' : 'retryPolicy',
    ...(head ? { serviceTier: route.serviceTier, capabilities: ['parcel-limit', 'second-based-eta'] } : {}),
  });
  json(`.generated/routes/${route.hub}--${route.service}.json`, {
    generatedBy: 'tools/scaffold.mjs',
    schemaVersion: head ? 2 : 1,
    routeId: route.id,
    revision: head ? 'seconds-policy-migration' : 'minute-policy-baseline',
    module: `${path}/index.js`,
    duration: { value: head ? route.transitMinutes * 60 : route.transitMinutes, unit: head ? 'seconds' : 'minutes' },
    retry: { source: head ? 'reliability.retryPolicy' : 'retryPolicy', maxAttempts: 3, delayMs: 10 },
    constraints: { maxWeightKg: route.maxWeightKg, ...(head ? { maxParcels: 12 } : {}) },
    quote: { baseCents: route.baseCents, currency: 'synthetic-cents' },
    ...(head ? { serviceTier: route.serviceTier, enabledFeatures: ['parcel-limit', 'second-based-eta'] } : {}),
  });
}
json('.generated/catalog-lock.json', {
  generatedBy: 'tools/scaffold.mjs',
  lockVersion: head ? 2 : 1,
  applicationVersion: version,
  dependencies: [],
  modules: routes.map((route) => ({
    routeId: route.id,
    schemaVersion: head ? 2 : 1,
    policyRevision: head ? 'seconds-reliability-v2' : 'minutes-retry-v1',
    durationUnit: head ? 'seconds' : 'minutes',
    ...(head ? { serviceTier: route.serviceTier, parcelLimit: 12 } : {}),
  })),
});

const table = Array.from({ length: 1800 }, (_, index) => {
  const route = routes[index % routes.length];
  return `  {
    id: 'terminal-${String(index + 1).padStart(4, '0')}',
    routeId: '${route.id}',
    originHub: '${route.hub}',
    service: '${route.service}',
    maxWeightKg: ${route.maxWeightKg},
    cutoffMinuteOfDay: ${900 + index % 6 * 15},
    bookingWindowMinutes: ${15 + index % 12 * 5},
    handlingSeconds: ${60 + index % 8 * 15 + (head ? 15 : 0)},
    routingRevision: '${head ? 'seconds-v2' : 'minutes-v1'}',
    note: '${head ? 'Consolidated terminal handoff window' : 'Legacy terminal handoff window'} ${String(index + 1).padStart(4, '0')}',
  },`;
});
write('src/routing/exception-rules.js', `import { validateShipment } from '../shared/validation.js';

export const TERMINAL_EXCEPTIONS = Object.freeze([
${table.join('\n')}
]);

export function findTerminalException(ruleId) {
  return TERMINAL_EXCEPTIONS.find((rule) => rule.id === ruleId) ?? null;
}

export function resolveTerminalException(shipment, { minuteOfDay, weekend = false }) {
  validateShipment(shipment);
${head ? "  if (shipment.coldChain === true && weekend) {\n    return { code: 'weekend-cold-chain', deferSeconds: 7200 };\n  }\n" : ''}  if (shipment.coldChain === true && minuteOfDay >= 1020) {
    return { code: 'cold-chain-cutoff', deferSeconds: 3600 };
  }
  return null;
}
`);

write('tests/helpers.js', `export const sampleShipment = Object.freeze({
  id: 'sample-shipment',
  weightKg: 2,
  parcels: 1,
});
export const noWait = async () => {};
`);
write('tests/route-modules.test.js', `import { listRoutes } from '../src/routing/registry.js';

for (const route of listRoutes()) {
  await import('../modules/' + route.routeId + '/policy.test.js');
}
`);
write('tests/retry-boundary.test.js', `import test from 'node:test';
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
`);
write('tests/quote-boundary.test.js', `import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteShipment } from '../src/quotes/quote-service.js';
import { calculateExpediteSurcharge } from '../src/quotes/expedite-surcharge.js';
import { sampleShipment } from './helpers.js';

test('quote boundary: a 45-minute route meets a 2-hour deadline without a surcharge', () => {
  const quote = quoteShipment({
    routeId: 'amber-bay/standard',
    shipment: sampleShipment,
    deadlineSeconds: 7200,
  });
  assert.equal(quote.surchargeCents, 0,
    'REGRESSION CHECK: the estimator and quote API must agree on seconds');
  assert.equal(quote.leadTimeSeconds, 2700);
  assert.equal(quote.totalCents, 500);
});

test('quote boundary: surcharge calculator accepts second-based durations', () => {
  assert.equal(calculateExpediteSurcharge({
    leadTimeSeconds: 2700, deadlineSeconds: 7200, baseCents: 500,
  }), 0);
  assert.equal(calculateExpediteSurcharge({
    leadTimeSeconds: 2700, deadlineSeconds: 1800, baseCents: 500,
  }), 75);
});

test('quote boundary: expired deadline is rejected', () => {
  assert.throws(() => quoteShipment({
    routeId: 'amber-bay/standard',
    shipment: sampleShipment,
    deadlineSeconds: 0,
  }), /deadlineSeconds/);
});
`);
write('tests/contracts.test.js', `import test from 'node:test';
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
    assert.equal(snapshot.duration.value, route.policy.${head ? 'transitSeconds' : 'transitMinutes'});
    assert.equal(snapshot.duration.unit, '${head ? 'seconds' : 'minutes'}');
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
${head ? `
test('oversized source tail: weekend cold-chain deferral is an intended new feature', () => {
  assert.deepEqual(resolveTerminalException({ ...sampleShipment, coldChain: true }, {
    minuteOfDay: 600, weekend: true,
  }), { code: 'weekend-cold-chain', deferSeconds: 7200 });
});
` : ''}`);

write('docs/policy-schema.md', `# Route policy contract, version ${head ? 2 : 1}

| Field | Contract |
| --- | --- |
| routeId | Stable hub/service key |
| ${head ? 'transitSeconds' : 'transitMinutes'} | Positive ${head ? 'seconds' : 'minutes'} for one parcel |
| ${head ? 'reliability.retryPolicy' : 'retryPolicy'} | Three total attempts, 10 ms delay by default |
| maxWeightKg | Positive kilograms |
| baseCents | Integer synthetic cents |
${head ? '| maxParcels | Twelve parcels per shipment |\n| serviceTier | Operational classification, not a price multiplier |\n' : ''}
The quote API always exposes seconds, regardless of the storage schema.
Additional parcels add two minutes each. Shipment-level retry overrides take precedence;
otherwise dispatch must inherit the route policy and then the shared default.
`);
write('docs/operations.md', `# Local operations, revision ${head ? 2 : 1}

Transport is an in-memory injected object. Tests never open sockets or contact carriers.
All hub names, shipments, prices, and terminal entries are synthetic original data.
Retry tests inject no-wait sleep, so the test suite has no wall-clock backoff cost.

${head
  ? 'Policy v2 moves storage to seconds and nests reliability settings. The intended feature also adds parcel limits, service tiers, and weekend cold-chain deferral.'
  : 'Policy v1 stores transit in minutes and has a root-level retryPolicy. Public quotes still expose seconds.'}

Do not deploy this fixture or use it to model actual shipping charges.
`);
write('README.md', head ? `# Synthetic Parcel Flow — large-change review fixture

An entirely original, dependency-free JS/Node project for validating Agent Review on
large diffs. Nothing here calls a network, uses real customer data, or models a security exploit.
All regressions are non-security business-correctness errors, deliberately planted.

## Git targets and scale

- \`main\` is the passing, real baseline commit (policy v1).
- \`large-change\` is the head commit (policy v2), with **over 630 changed files**.
- 90 hub/service modules each change six files: public exports, policy, adapter,
  local node:test tests, module documentation, and manifest (540 module files).
- Another 90 generated route snapshots plus a catalog lock add realistic review noise.
- Source modules use ESM and only Node built-ins; Node 20+ is sufficient. No install is needed.
- Scoped AGENTS.md rules exist at root, modules/, src/, src/retry/, src/quotes/,
  src/routing/, tests/, and .generated/. The most specific directory rules apply.

## Commands (from this directory)

\`\`\`powershell
git log --oneline --all --decorate
git diff --shortstat main...large-change
git diff --name-only main...large-change
git diff --stat main...large-change
npm run inspect
npm test
npm run test:regressions
npm run test:routes
npm run test:contracts
\`\`\`

\`npm test\` intentionally exits 1 on head with exactly two failing tests. The 270 local
route tests and all structural/validation/oversized-file tests pass. The regression-only
command isolates the two failures alongside passing controls. Test output names each boundary.

To verify the baseline without changing either branch:

\`\`\`powershell
git switch main
npm test
git switch large-change
\`\`\`

Only switch branches with a clean worktree. Baseline has 282 passing tests; head has
283 tests, 281 passing and 2 intentionally failing (the new weekend behavior adds a test).

## Intended findings and controls

### 1. Retry inheritance silently collapses to one attempt

- \`modules/amber-bay/standard/policy.js\` (representative of all 90 routes) moves
  \`retryPolicy\` under \`reliability.retryPolicy\`.
- \`src/dispatch/dispatch-service.js\` passes that policy to
  \`src/retry/resolve-policy.js:resolveRetryPolicy\`. The latter still reads the old root
  field and changes its fallback to one attempt. Omitted shipment overrides therefore
  stop after the first transient failure instead of recovering on attempt three.
- \`tests/retry-boundary.test.js\` reproduces this via the public dispatch API.
  Explicit overrides, permanent-error handling, and first-attempt success are passing controls.
- \`src/shared/validation.js:validateRetryPolicy\` is **unchanged supporting code**.
  One attempt is structurally valid, so validation cannot repair lost inheritance.
- Intended fix: understand the nested route setting and preserve DEFAULT_RETRY_POLICY
  when neither a shipment override nor route setting is provided. Do not implement the fix here.

### 2. ETA seconds are multiplied by 60 again at the quote boundary

- \`src/scheduling/lead-time.js:estimateLeadTime\` now returns seconds, using v2
  \`transitSeconds\`; each extra parcel adds 120 seconds.
- \`src/quotes/quote-service.js:quoteShipment\` updates the imported symbol but retains
  the legacy \`* 60\` conversion before calling \`calculateExpediteSurcharge\`.
- A 45-minute route reports 162000 instead of 2700 seconds. It wrongly misses a
  7200-second deadline and adds 75 cents to a 500-cent quote.
- \`tests/quote-boundary.test.js\` reproduces this end-to-end and separately proves the
  unchanged surcharge calculator is correct with second-based inputs.
- Intended fix: remove the obsolete caller conversion. Do not implement the fix here.

### Oversized late-file change (intended behavior, not a third bug)

\`src/routing/exception-rules.js\` has over 16000 lines and exceeds 500 KiB, with a diff
over 256 KiB. Table churn dominates it. After that table,
\`resolveTerminalException\` adds a **weekend cold-chain deferral of 7200 seconds**.
Reviewers should see this meaningful late change instead of truncating the entire tail.
\`tests/contracts.test.js\` covers the late addition and retained weekday cutoff.
\`npm run inspect\` prints exact byte counts and function line numbers.

## Review acceptance checks

1. Select the baseline/head branches above and verify more than 500 changed files load.
2. Distinguish 540 coherent module edits from generated/catalog-lock churn and docs.
3. Load nested AGENTS.md instructions, including the retry and quote unit contracts.
4. Trace each planted failure across producer, consumer, and unchanged validation.
5. Inspect the oversized source tail; recognize its weekend behavior as intentional.
6. Surface the two real behavioral regressions rather than inventing security findings
   or treating every generated record as a separate issue.
7. Run baseline and head tests and retain the deliberate failing expectations.

## Reproduction and safety

\`tools/scaffold.mjs --stage baseline|head\` is a deterministic fixture generator.
Run it with \`node\` only in a disposable copy: it overwrites fixture-owned source,
tests, docs, and snapshots, but does not create commits or delete unknown files.
It uses no external packages. The checked-in npm lock contains no dependencies;
\`.generated/catalog-lock.json\` is synthetic application-catalog churn, not downloaded code.
This project is standalone and has no remote configured. No pushes are needed.
` : `# Synthetic Parcel Flow — passing baseline

Original dependency-free Node ESM code for a standalone large-change review fixture.
There are 90 local hub/service modules, synthetic generated snapshots, and a large
terminal-routing source table. All transport is in memory, all data is synthetic,
and tests use node:test with no external packages or network access.

Run \`npm test\` with Node 20+; all 282 baseline tests should pass without installation.
\`main\` will point to this baseline and \`large-change\` to the policy-v2 migration.
The head README documents intended non-security correctness findings and inspection commands.

The policy v1 contract stores transit in minutes and retryPolicy at the policy root.
Public quotes expose seconds. Omitted dispatch overrides inherit three total attempts.
Nested AGENTS.md files specify review contracts, including units and retry inheritance.

The deterministic generator is \`node tools/scaffold.mjs --stage baseline|head\`.
It overwrites fixture-owned files; do not run it over manual changes.
No dependencies, third-party source, real I/O, secrets, or security exploits are present.
`);

console.log(`Wrote ${written} deterministic ${stage} fixture files in ${root}`);
