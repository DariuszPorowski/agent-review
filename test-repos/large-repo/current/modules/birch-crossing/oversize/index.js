import { policy } from './policy.js';

export { policy };
export { buildPayload, dispatch } from './adapter.js';
export const routeId = policy.routeId;
export const isColdChainRoute = policy.service === 'cold-chain';
export const serviceTier = policy.serviceTier;
export const routingVersion = 2;
