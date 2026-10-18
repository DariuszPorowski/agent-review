import { getRoute } from '../routing/registry.js';
import { estimateLeadTime } from '../scheduling/lead-time.js';
import { calculateExpediteSurcharge } from './expedite-surcharge.js';

export function quoteShipment({ routeId, shipment, deadlineSeconds }) {
  const route = getRoute(routeId);
  const leadTimeSeconds = estimateLeadTime(route.policy, shipment) * 60;
  const baseCents = route.policy.baseCents;
  const surchargeCents = calculateExpediteSurcharge({ leadTimeSeconds, deadlineSeconds, baseCents });
  return { routeId, leadTimeSeconds, baseCents, surchargeCents, totalCents: baseCents + surchargeCents };
}
