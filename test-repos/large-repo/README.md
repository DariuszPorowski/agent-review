# Large-repository review project

Original, dependency-free synthetic Parcel Flow source, with 90 hub/service
modules, generated catalog noise, and a 500+ KiB source file. Two deliberately
broken business contracts distinguish real findings from harmless migration
churn. Do not fix the planted regressions in this fixture.

## Prepare and open

From the Agent Review checkout, with Git and Node.js 20+:

```powershell
node .\test-repos\prepare.mjs large-repo C:\temp\agent-review-large-repo-sample
```

Use a **new** directory; your existing validation repositories are not modified.
The checked-in `current/` tree is source data, not an independent Git repository.
The preparer uses its deterministic generator to commit a passing `main`
baseline, then commits the checked-in change on `large-change`. No dependencies
are installed and no tests are run during setup.

In Agent Review, **Change repository** to the printed directory. Choose
**Commit**, select `large-change`, and compare with `main`. The fixture's
`.agent-review.json` also sets the base to `main`.

## Intended findings

1. **Retry inheritance:** policies move to `reliability.retryPolicy`, but
   `src/retry/resolve-policy.js` still reads the old root field and falls back to
   one attempt. Follow the unchanged dispatch consumer, default policy,
   validation, and `tests/retry-boundary.test.js`. An omitted override should
   recover on the third attempt; explicit overrides remain passing controls.
2. **Double duration conversion:** `src/scheduling/lead-time.js` now returns
   seconds, but `src/quotes/quote-service.js` still multiplies by 60. A 45-minute
   route becomes 162000 rather than 2700 seconds. Follow the unchanged surcharge
   calculation and `tests/quote-boundary.test.js`.
3. **Not a defect:** the late `resolveTerminalException` change in
   `src/routing/exception-rules.js` adds an intended 7200-second weekend
   cold-chain deferral. Its tests pass. Do not equate table churn or static
   connectivity with a separate bug or a security finding.

## What to evaluate

- **Scale and internal processing:** all **642 changed files** remain
  represented. Internal collection/retrieval passes consolidate into one
  ranked, deduplicated report; incomplete analysis must say it is incomplete.
- **Sections:** the repeated `buildPayload` implementations form a source-backed
  cohort, with contracts, linked callers/tests, and supporting files accessible.
  Filter for `cedar-point`; **Open first range** must honor that filter.
- **Impact:** follow producers into unchanged consumers and related tests.
  Relationship direction, saved evidence, confidence, and graph limits must
  remain explicit.
- **Large source:** open both attention entries for `exception-rules.js`, switch
  to a small item and back, and inspect the meaningful function after line
  21000. Gap toggles and warm switches should remain responsive, without blank
  multi-second rebuilds. Gaps shorter than five lines remain inline.
- **Discussion:** ask about one item or section; follow exact base/current
  citations, preserve a draft, and try Stop. Missing supplied excerpts must not
  be described as missing saved files. Tests do not run automatically.
- **Navigation:** try Ctrl+K, J/K, A, I, F, Escape, and Copy location. Opening
  source and changing items must retain visible focus; local links must not
  silently substitute another snapshot.
- Repeat in light/dark themes and around 390px width. Distinguish static review
  priority, AI interpretation, source evidence, and actual executed-test proof.

## Explicit validation

From the prepared repository:

```powershell
npm run inspect
npm test
npm run test:regressions
npm run test:routes
npm run test:contracts
```

`npm test` intentionally exits **1**: **283 tests, 281 pass, 2 fail**. The two
failures are the retry and quote boundaries above. Routes and contracts pass.
To verify the baseline, start from a clean worktree:

```powershell
git switch main
npm test
git switch large-change
```

Baseline: **282 tests pass**. Do not weaken expectations to make the changed
snapshot green. The generator overwrites fixture-owned files; run it only in
a disposable prepared copy, not to edit the checked-in source data.
