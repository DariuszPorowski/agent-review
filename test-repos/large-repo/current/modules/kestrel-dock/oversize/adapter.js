import { validateShipment } from '../../../src/shared/validation.js';
import { policy } from './policy.js';

export function buildPayload(shipment) {
  validateShipment(shipment);
  if (shipment.weightKg > policy.maxWeightKg) throw new RangeError('route weight limit exceeded');
  if (shipment.parcels > policy.maxParcels) throw new RangeError('route parcel limit exceeded');
  return {
    routeId: policy.routeId,
    shipmentId: shipment.id,
    weightKg: shipment.weightKg,
    parcels: shipment.parcels,
    schemaVersion: 2,
    transitSeconds: policy.transitSeconds,
    serviceTier: policy.serviceTier,
  };
}

export async function dispatch(shipment, transport) {
  return transport.send(buildPayload(shipment));
}
