import test from 'node:test';
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
