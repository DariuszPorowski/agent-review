# Route-module rules

- A module owns one hub/service pair and exports policy, payload construction, and dispatch.
- Keep route IDs stable across schema migrations.
- Retry settings must still reach the central dispatch service when callers omit overrides.
- Contract tests here may evolve with field names; business-behavior tests in tests/ must remain.
- Weight is kilograms, money is integer cents, and duration field names must state units.
