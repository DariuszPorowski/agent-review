import { validateShipment } from '../shared/validation.js';

export function estimateLeadTime(routePolicy, shipment) {
  validateShipment(shipment);
  const additionalParcels = Math.max(0, shipment.parcels - 1);
  return routePolicy.transitSeconds + additionalParcels * 120;
}
