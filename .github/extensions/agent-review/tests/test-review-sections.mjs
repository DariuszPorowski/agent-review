import assert from "node:assert/strict";
import test from "node:test";
import { reviewSections } from "../web/review-sections.mjs";
import { ReviewState } from "../review-state.mjs";
import { sectionsFor } from "../review-sections-context.mjs";

test("sections group changed contracts with callers and linked tests rather than folders or batches", () => {
    const model = { changes: ["contracts/value.js", "api/consumer.js", "tests/value.test.js", "docs/notes.md"].map((path) =>
        ({ path, status: "modified" })), evidence: { call: {}, test: {} },
    nodes: [
        { id: "contract", path: "contracts/value.js", kind: "function", name: "convert", change: "modified", start_line: 2, end_line: 4 },
        { id: "consumer", path: "api/consumer.js", kind: "function", name: "quote", change: "modified", start_line: 1, end_line: 9 },
        { id: "test", path: "tests/value.test.js", kind: "function", name: "checks_conversion", change: "modified", start_line: 1 },
    ], edges: [
        { source: "consumer", target: "contract", type: "calls", evidence_ids: ["call"] },
        { source: "test", target: "contract", type: "calls", evidence_ids: ["test"] },
    ] };
    const sections = reviewSections(model, [{ claim: "The conversion now produces seconds.",
        citations: [{ path: "contracts/value.js", side: "current", line: 3 }] }]);
    const behavior = sections.find((section) => section.kind === "behavior");
    assert.equal(behavior.title, "Change convert");
    assert.equal(behavior.summary, "The conversion now produces seconds.");
    assert.equal(behavior.ranges.length, 3);
    assert.equal(behavior.tests.length, 1);
    assert.ok(sections.some((section) => section.ranges.some((range) => range.path === "docs/notes.md")));
});

test("all changed paths remain represented even without language analysis", () => {
    const paths = Array.from({ length: 520 }, (_, index) => `files/${index}.data`);
    const result = reviewSections({ changes: paths.map((path) => ({ path, status: "modified" })), nodes: [], edges: [] });
    assert.deepEqual(new Set(result.flatMap((section) => section.ranges.map((range) => range.path))), new Set(paths));
});
test("repeated implementations form a source-backed cohort only when structure and dependencies agree", () => {
    const model = {
        changes: ["one.js", "two.js"].map((path) => ({ path, status: "modified" })),
        nodes: [{ id: "helper", path: "helper.js", kind: "function", name: "validate", change: "unchanged" },
            ...["one", "two"].map((id) => ({ id, path: `${id}.js`, kind: "function", name: "build", change: "modified", start_line: 1, end_line: 3 }))],
        symbols: ["one", "two"].map((id) => ({ id, name: "build", kind: "function", normalized_ast_hash: "same-implementation" })),
        edges: ["one", "two"].map((id) => ({ source: id, target: "helper", type: "calls", evidence_ids: ["call"] })),
        evidence: { call: {} },
    };
    const grouped = reviewSections(model);
    assert.equal(grouped.length, 1);
    assert.match(grouped[0].title, /2 implementations/);
    model.symbols[1].normalized_ast_hash = "different";
    assert.equal(reviewSections(model).length, 2);
});
test("section source and discussion contexts resolve to the exact pinned item ranges", async () => {
    const state = new ReviewState("C:\\repo");
    state.model = { metadata: {}, nodes: [], edges: [], evidence: {}, coverage: {},
        changes: [{ path: "config.json", status: "modified", current_lines: 1 }],
        source_files: { "config.json": { current: '{"value":2}', baseline: '{"value":1}', diff: "" } } };
    const result = sectionsFor(state.model);
    assert.equal(result.represented_files, 1);
    assert.equal(result.analysis_status, "not requested");
    const section = result.sections[0];
    const context = state.contextFor(section.id);
    assert.equal(context.item.kind, "section");
    assert.equal(context.item.path, "config.json");
    assert.equal(context.section.ranges.length, 1);
    assert.equal((await state.sourceFor(section.id)).current, '{"value":2}');
    assert.equal((await state.discussionFor(section.id)).item_id, section.id);
});
