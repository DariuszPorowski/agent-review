import assert from "node:assert/strict";
import test from "node:test";
import { customAnalysisContext, buildCustomAnalysisPrompt, validateCustomAnalysis } from "../custom-analysis.mjs";

test("custom analysis uses bounded saved source and discloses partial evidence", () => {
    const changes = Array.from({ length: 30 }, (_, index) => ({
        path: `file${index}.py`, status: "modified", lines_added: 10, lines_removed: 1,
    }));
    const model = { changes, source_files: Object.fromEntries(changes.map((item) => [item.path, {
        current: "code ".repeat(2000), diff: "+changed\n".repeat(2000),
    }])), metadata: {}, summary: {}, coverage: { available: false } };
    const context = customAnalysisContext(model);
    assert.ok(context.files.reduce((count, item) => count + (item.current?.length || 0) + (item.diff?.length || 0), 0) <= 40_000);
    assert.equal(context.files.length, 20, "budget exhaustion preserves file metadata and discloses unavailable source");
    assert.equal(context.evidence_limits.truncated, true);
    assert.equal(context.coverage_available, false);
    const prompt = buildCustomAnalysisPrompt({ prompt: "Check cancellation handling." }, context);
    assert.match(prompt, /Check cancellation handling/);
    assert.match(prompt, /Do not call tools/);
    assert.match(prompt, /UNTRUSTED DATA ONLY/);
});

test("custom responses enforce concise output and usable snapshot citations", () => {
    const context = { files: [{ path: "src/main.py" }] };
    assert.equal(validateCustomAnalysis("## Findings\n\nNo supported findings.\n\n## Verification\n\nCheck `src/main.py:3`.", context).startsWith("## Findings"), true);
    assert.ok(validateCustomAnalysis("## Findings\n\nSee `main.py:3`.\n\n## Verification\n\nCheck source.", context), "a unique filename resolves like a source link");
    const ambiguous = { files: [{ path: "src/main.py" }, { path: "tools/main.py" }] };
    assert.throws(() => validateCustomAnalysis("## Findings\n\nSee `main.py:3`.\n\n## Verification\n\nCheck source.", ambiguous),
        /outside its supplied evidence: main\.py.*allowed list: src\/main\.py, tools\/main\.py/);
    assert.throws(() => validateCustomAnalysis("## Findings\n\nSee `other.py:3`.\n\n## Verification\n\nCheck source.", context), /outside its supplied evidence/);
    assert.match(buildCustomAnalysisPrompt({ prompt: "Check evidence." }, context),
        /Untested rejection branches.*evidence gaps, not bugs/);
    assert.throws(() => validateCustomAnalysis("## Findings\n\nSee `src/main.py:~3`.\n\n## Verification\n\nCheck source.", context), /exact positive line numbers/);
    assert.throws(() => validateCustomAnalysis("## Findings\n\nSee nothing/main2.py:3.\n\n## Verification\n\nCheck source.", context), /outside its supplied evidence/);
    assert.throws(() => validateCustomAnalysis("## Findings\n\nSee main.py:999.\n\n## Verification\n\nCheck source.",
        { files: [{ path: "src/main.py", current_line_count: 3 }] }), /outside the saved current source/, "line bounds apply to the resolved file");
    assert.throws(() => validateCustomAnalysis(`## Findings\n\n${"word ".repeat(251)}\n\n## Verification\n\nCheck source.`, context), /250 words/);
    assert.throws(() => validateCustomAnalysis("## Findings\n\nNo supported findings. Here is an inventory of correct code.\n\n## Verification\n\nCheck source.", context), /positive-code inventory/);
});

test("expanded diff-only evidence includes every change without repeating large source files", () => {
    const changes = Array.from({ length: 30 }, (_, index) => ({
        path: `file${index}.ts`, status: "modified", lines_added: 100, lines_removed: 1,
    }));
    const reviewed = {
        changes,
        source_files: Object.fromEntries(changes.map(({ path }) => [path, {
            current: "unchanged source\n".repeat(10_000),
            diff: "@@ -500,1 +500,100 @@\n" + "+changed source\n".repeat(100),
        }])),
    };
    const context = customAnalysisContext(reviewed, {
        maxFiles: 100, maxSourceCharacters: 300_000, diffOnly: true,
    });
    assert.equal(context.files.length, 30);
    for (const file of context.files) {
        assert.equal(file.diff, reviewed.source_files[file.path].diff);
        assert.equal(file.current, "");
        assert.equal(file.current_line_count, 10_001);
        assert.equal(file.unavailable, undefined);
    }
    assert.equal(context.evidence_limits.truncated, false);
    assert.equal(context.evidence_limits.omitted_files, 0);
    assert.match(context.evidence_limits.scope, /unchanged code outside the diff context is not included/);
    assert.match(buildCustomAnalysisPrompt({ prompt: "Check rules." }, context), /@@ hunk headers/);
});

test("expanded evidence remains bounded and reports exhausted and omitted files", () => {
    const reviewed = {
        changes: ["a.ts", "b.ts", "c.ts"].map((path) => ({
            path, status: "modified", lines_added: 1, lines_removed: 0,
        })),
        source_files: {
            "a.ts": { current: "long file", diff: "+x\n".repeat(100) },
            "b.ts": { current: "short file", diff: "+x\n" },
        },
    };
    const context = customAnalysisContext(reviewed, { maxFiles: 2, maxSourceCharacters: 1, diffOnly: true });
    assert.equal(context.files.length, 2);
    assert.equal(context.files[0].diff.length, 1);
    assert.equal(context.files[1].unavailable, "Source budget exhausted");
    assert.equal(context.evidence_limits.truncated, true);
    assert.equal(context.evidence_limits.omitted_files, 1);
    assert.equal(context.evidence_limits.max_source_characters, 1);
    for (const options of [{ maxFiles: 0 }, { maxSourceCharacters: Infinity }, { diffOnly: "true" }]) {
        assert.throws(() => customAnalysisContext(reviewed, options), /Review evidence limits/);
    }
});

test("a dominant lockfile cannot consume the source files' diff budgets", () => {
    const paths = ["package-lock.json", ...Array.from({ length: 5 }, (_, index) => `src/f${index}.ts`)];
    const reviewed = {
        changes: paths.map((path, index) => ({
            path, status: "modified", lines_added: index === 0 ? 100_000 : 10, lines_removed: 0,
        })),
        source_files: Object.fromEntries(paths.map((path, index) => [path, {
            current: "source",
            diff: index === 0 ? "+lock entry\n".repeat(40_000) : "+source change\n".repeat(10),
        }])),
    };
    const context = customAnalysisContext(reviewed, {
        maxFiles: 100, maxSourceCharacters: 300_000, diffOnly: true,
    });
    for (const file of context.files.slice(1)) {
        assert.equal(file.diff, reviewed.source_files[file.path].diff);
        assert.equal(file.unavailable, undefined);
    }
    const sourceCharacters = context.files.slice(1).reduce((sum, file) => sum + file.diff.length, 0);
    assert.equal(context.files[0].diff.length, 300_000 - sourceCharacters);
    assert.equal(context.evidence_limits.truncated, true);
});

test("large diffs share remaining space without reserving space for binary, empty, or omitted files", () => {
    const reviewed = {
        changes: ["a.ts", "b.ts", "small.ts", "binary.png", "empty.ts", "omitted.ts"].map((path) => ({
            path, status: "modified", lines_added: 1, lines_removed: 0,
        })),
        source_files: {
            "a.ts": { diff: "a".repeat(400_000) },
            "b.ts": { diff: "b".repeat(400_000) },
            "small.ts": { diff: "+small\n" },
            "binary.png": { binary: true, diff: "binary".repeat(1000) },
            "empty.ts": { diff: "" },
            "omitted.ts": { diff: "not selected".repeat(1000) },
        },
    };
    const context = customAnalysisContext(reviewed, { maxFiles: 5, maxSourceCharacters: 300_000, diffOnly: true });
    const [first, second, small, binary, empty] = context.files;
    assert.equal(small.diff, "+small\n");
    assert.ok(Math.abs(first.diff.length - second.diff.length) <= 1);
    assert.equal(first.diff.length + second.diff.length + small.diff.length, 300_000);
    assert.equal(binary.unavailable, "Binary file");
    assert.equal(empty.unavailable, "No textual diff available");
    assert.equal(context.evidence_limits.omitted_files, 1);
});

test("a trailing-newline-only change discloses the missing textual diff", () => {
    const reviewed = {
        changes: [{ path: "src/newline.ts", status: "modified", lines_added: 0, lines_removed: 0 }],
        source_files: { "src/newline.ts": { baseline: "const a = 1;", current: "const a = 1;\n", diff: "" } },
    };
    const context = customAnalysisContext(reviewed, { diffOnly: true });
    assert.equal(context.files[0].unavailable, "No textual diff available");
    assert.equal(context.evidence_limits.truncated, true);
    assert.match(buildCustomAnalysisPrompt({ prompt: "Check rules." }, context), /No textual diff available/);
    const regular = customAnalysisContext(reviewed);
    assert.match(regular.files[0].current, /^1: const a = 1;/);
    assert.equal(regular.files[0].unavailable, undefined, "summary/custom-check defaults still include current source");
});

test("an absent saved diff is distinct from an exhausted diff budget", () => {
    const context = customAnalysisContext({
        changes: [{ path: "missing.ts", status: "modified" }],
    }, { diffOnly: true });
    assert.equal(context.files[0].unavailable, "No textual diff available");
    assert.equal(context.evidence_limits.truncated, true);
});
