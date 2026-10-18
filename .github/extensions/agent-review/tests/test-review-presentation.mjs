import assert from "node:assert/strict";
import test from "node:test";
import { annotationSections, conciseReviewText, reviewCommands, reviewItemEvidence, reviewSignal } from "../web/review-presentation.mjs";

test("static priority signals and AI-supported concerns are not labeled confirmed defects", () => {
    assert.equal(reviewSignal({ id: "attention:size" }).label, "Review priority");
    assert.equal(reviewSignal({ verification: "supported" }).label, "AI-supported concern");
    assert.equal(reviewSignal({ id: "observation:one" }).label, "Review observation");
});
test("concise card text is explicitly truncated rather than silently rewritten", () => {
    assert.equal(conciseReviewText("Short"), "Short");
    assert.ok(conciseReviewText("word ".repeat(100)).endsWith("…"));
    assert.ok(conciseReviewText("word ".repeat(100)).length <= 241);
});
test("progressive explanations retain preambles and do not mistake fenced code for section headings", () => {
    const parsed = annotationSections("Context.\n## What changed\n- A change.\n```md\n## Not a real heading\n```\n## Verify\n- Check it.");
    assert.equal(parsed.preamble, "Context.");
    assert.deepEqual(parsed.sections.map((section) => section.title), ["What changed", "Verify"]);
    assert.match(parsed.sections[0].text, /Not a real heading/);
});
test("the command catalog exposes source symbols and changed files without pretending to search full source", () => {
    const model = { changes: [{ path: "a.js", status: "modified" }], nodes: [
        { id: "function", name: "run", kind: "function", path: "a.js", change: "modified" },
    ], attention: [{ id: "attention:one", node_id: "function", title: "Complexity increased" }], evidence: {} };
    const catalog = reviewCommands(model);
    assert.equal(catalog.length, 3);
    assert.equal(catalog.find((item) => item.id === "attention:one").path, "a.js");
    const evidence = reviewItemEvidence(model, model.attention[0]);
    assert.deepEqual(evidence.counts, { confirmed: 0, failing: 0, inferred: 0, unknown: 0 });
});
