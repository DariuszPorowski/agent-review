# Test rules

- Business-boundary tests assert stable behavior even when local schema tests change.
- Use node:test, built-in assertions, synthetic shipments, and injected no-wait sleep.
- Do not change expected results to conceal a correctness regression.
