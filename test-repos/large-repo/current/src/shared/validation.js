export function validateShipment(shipment) {
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
