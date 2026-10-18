# Retry rules

- Omitted shipment overrides inherit the route retry policy, then DEFAULT_RETRY_POLICY.
- maxAttempts counts the first attempt; a value of 3 allows two retries.
- Never turn an omitted policy into a silent single-attempt policy.
- Only errors explicitly marked retryable may be retried.
- shared/validation.js validates shape and ranges, not whether inheritance was preserved.
