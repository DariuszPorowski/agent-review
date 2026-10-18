# Parcel Flow contributor rules

- All code and data here are synthetic; do not add dependencies or network access.
- Preserve public dispatch and quote behavior when migrating route policy schemas.
- Review caller/callee contracts, defaults, retry attempt counts, and duration units.
- Run `npm test`; do not weaken an expectation simply to accommodate a migration.
- Nested AGENTS.md files narrow these rules for their own directories.
- Generated snapshots are evidence of source changes, not authoritative business logic.
