import { listRoutes } from '../src/routing/registry.js';

for (const route of listRoutes()) {
  await import('../modules/' + route.routeId + '/policy.test.js');
}
