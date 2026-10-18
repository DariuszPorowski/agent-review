import { validateRetryPolicy } from '../shared/validation.js';

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
