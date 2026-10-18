# Node.js / TypeScript review project

A small npm workspace mixing JS, TS, JSX, and TSX, source aliases, dependency
changes, and isolated native ESM tests. This is the fuller coverage-enabled
project used for interactive validation, not the smaller browser-test fixture.

## Prepare and open

From the Agent Review checkout, with Git and Node.js 22.15+:

```powershell
node .\test-repos\prepare.mjs node-demo C:\temp\agent-review-node-demo-sample
```

Use a new destination. `baseline/` and `current/` are checked-in source trees,
not nested repositories. Setup creates a local `main` baseline and leaves the
feature changes **uncommitted**. It installs nothing and runs no tests.

In Agent Review, **Change repository** to the printed directory, choose
**Worktree**, and compare with **HEAD**. Do not commit the feature while
evaluating Worktree mode.

## What to evaluate

- **Graph and Impact:** inspect cross-package source links, TypeScript exports,
  JSX/TSX components, and consumers of `resolveReference`. External, dynamic,
  or unresolved links must carry limitations rather than invented edges.
- **Packages:** compare lodash's manifest/lockfile versions, added picocolors,
  and c8 development tooling. Package-version evidence is distinct from current
  registry/OSV metadata; unavailable network metadata must stay explicit.
- **Code paths:** `packages/core/src/resolver.js` adds a missing-title `null`
  return at line 3 and an untested legacy throw at line 6; its trimmed-title
  return is at line 8. Two separate top-level tests exercise the returns.
- **Execution evidence:** before execution, links are static/inferred. Explicit
  **Run linked tests** should pass two tests and confirm the two returns, not
  the throw. TS/JSX/TSX code is not executed merely because it appears in the
  graph.
- **Sections and discussion:** follow the changed return contract and its
  source-linked consumers; ask about the unsupported legacy case. Answers must
  cite saved ranges and identify what was not tested.
- **UX:** open a card with Enter; try J/K, Impact, Section, Ctrl+K, code focus,
  and source-close return focus. Check light/dark, narrow layout, draft
  preservation, and snapshot-local Copy location links.

## Explicit tests and coverage

From the prepared repository:

```powershell
npm test
npm ci --ignore-scripts
npm run coverage
```

The two JS tests use only Node built-ins; `npm test` needs no install. Install
the locked local dependencies for **coverage** or work on the UI imports.
No global installation is needed.

The original validation lockfile is retained, not a production dependency
recommendation. npm may report audit findings or tooling deprecations. Evaluate
that evidence separately; do not run an automatic upgrade if you want to retain
the fixture's original dependency comparison.

Coverage is generated locally, not copied from another machine. The helper in
`tools/coverage-sources.mjs` records exact-source SHA-256 associations before and
after collection and rejects a source change during collection. Reanalyze after
generation or edits.

Expected resolver aggregate coverage: **7/9 lines (77.78%)**; changed executable
lines: **4/6 (66.67%)**. Lines 6 and 7 remain uncovered. Imported reports are
aggregate evidence, never proof of which named test ran a path. Confirmed
per-test evidence comes only from the explicit linked-test action.
