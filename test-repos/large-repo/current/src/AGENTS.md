# Runtime rules

- Keep validation centralized in shared/validation.js and call it at public boundaries.
- No real I/O: transport and sleep are injected, deterministic functions.
- Preserve behavior across schema changes and inspect consumers, not only migrated producers.
