# Python coverage and linked-test review project

A minimal shipping function separates saved aggregate coverage, static test
links, and per-test execution. Its negative-amount and no-result paths are
intentionally untested controls, not bugs to fix in this fixture.

## Prepare and open

From the Agent Review checkout, with Git and Node.js 20+:

```powershell
node .\test-repos\prepare.mjs coverage-demo C:\temp\agent-review-coverage-demo-sample
```

Use a new destination. `baseline/` and `current/` are source data. The preparer
creates a committed baseline and leaves exactly the shipping source/test change
uncommitted; it installs nothing and runs no tests.

Use **Change repository** in Agent Review, choose the printed directory, then
**Worktree** against **HEAD**. Keep the feature uncommitted during evaluation.
Python 3.11+ is required for test execution. `.agent-review.json` uses `python`
from PATH; set `test_python` to your project's interpreter if needed.

## Generate real coverage explicitly

From the prepared repository:

```powershell
python -m pytest -q
python -m coverage run --branch --source=shipping -m pytest -q
python -m coverage json -o coverage.json
python -m coverage report -m
```

If the selected interpreter reports missing modules, install `pytest` and
`coverage` in that environment first. No report from the original machine is
bundled. Coverage should be **unknown**, not zero, before a report is generated.
After generating coverage or editing source, **Reanalyze**.

## What to evaluate

1. **Change brief:** coverage becomes measured: **8/10 executable lines (80%)**
   and **6/8 branches (75%)**. Changed executable lines are **6/8 (75%)**.
2. **Code paths before execution:** four changed paths are inferred from test
   links, none confirmed. An imported aggregate report does not identify a
   named executing test.
3. **Run linked tests:** explicitly run the three tests. All pass; the expedited
   return at `shipping.py:7` and free return at line 9 become Confirmed. The
   negative-amount raise at line 3 and zero-amount `None` return at line 5 remain
   Not executed. The unchanged standard return is not a new changed path.
4. **Filters:** Untested isolates the raise and no-result paths; Confirmed
   isolates the two executed new returns. All restores the complete list.
5. **Source and discussion:** inspect Current line 8, Copy location, reopen it,
   press A, and send with Ctrl+Enter. The question's saved location must remain
   `shipping.py:8`, `side=current`, rather than the first visible context line.
   Repeat with Base and verify its actual saved coordinates.
6. **Snapshot safety:** a link from another snapshot must expose a visible
   warning, not open newer source or hide the warning behind an existing pane.
7. **UX:** check keyboard-visible focus, sections, Impact, concise AI/evidence
   labels, light/dark themes, and a 390px layout with the composer in view.

The three current tests pass; the baseline has one passing test. Neither a
passing suite nor a static caller link proves the two untested paths are safe.
No custom AI analysis is required to evaluate coverage and execution evidence.
