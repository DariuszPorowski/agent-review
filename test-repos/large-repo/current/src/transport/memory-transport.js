export function createMemoryTransport({ transientFailures = 0, permanentFailure = false } = {}) {
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
