import assert from "node:assert/strict";
import test from "node:test";
import { annotationCodeContext } from "../annotation-context.mjs";

const text = (count, label = "line") => Array.from({ length: count }, (_, i) => `${label} ${i + 1}`).join("\n");
const selected = { id: "function", name: "merge", kind: "function", path: "a.js",
    start_line: 1, end_line: 250, change: "modified" };
const context = (subject = selected) => ({ subject, evidence: {}, related_edges: [] });

test("selected bodies include behavior beyond the former 120-line cutoff on both sides", async () => {
    const source = text(250) + "\nreturn finalPrecedenceWinner;";
    const result = await annotationCodeContext({ nodes: [] }, context({ ...selected, end_line: 251 }),
        async () => ({ current: source, base: source, diff: "" }));
    assert.equal(result.current.complete, true);
    assert.equal(result.base.complete, true);
    assert.match(result.current.ranges[0].excerpt, /251: return finalPrecedenceWinner/);
    assert.match(result.base.ranges[0].excerpt, /251: return finalPrecedenceWinner/);
});

test("before ranges follow saved diff coordinates after earlier insertions and whole-block replacement", async () => {
    const result = await annotationCodeContext({ nodes: [] }, context({ ...selected, start_line: 5, end_line: 7 }),
        async () => ({ current: "intro\nadded\nadded\nspacer\nfunction merge() {\nreturn newWinner;\n}",
            base: "intro\nspacer\nfunction merge() {\nreturn oldWinner;\n}",
            diff: "@@ -1,2 +1,4 @@\n intro\n+added\n+added\n spacer\n@@ -3,3 +5,3 @@\n function merge() {\n-return oldWinner;\n+return newWinner;\n }\n" }));
    assert.deepEqual(result.base.requested_ranges, [[3, 5]]);
    assert.match(result.base.ranges[0].excerpt, /4: return oldWinner/);
    assert.match(result.current.ranges[0].excerpt, /6: return newWinner/);
    assert.doesNotMatch(result.diff, /\+added/);
    const replacement = await annotationCodeContext({ nodes: [] }, context({ ...selected, end_line: 2 }),
        async () => ({ current: "new start\nnew end", base: "old start\nold middle\nold end",
            diff: "@@ -1,3 +1,2 @@\n-old start\n-old middle\n-old end\n+new start\n+new end\n" }));
    assert.deepEqual(replacement.base.requested_ranges, [[1, 3]]);
    assert.match(replacement.base.ranges[0].excerpt, /old end/);
});

test("late-file selections receive their own source and diff rather than the first file hunk", async () => {
    const source = text(1500);
    const result = await annotationCodeContext({ nodes: [] }, context({ ...selected, start_line: 1400, end_line: 1420 }),
        async () => ({ current: source, base: source,
            diff: "@@ -1 +1 @@\n-old unrelated\n+new unrelated\n@@ -1400 +1400 @@\n-old decision\n+new decision\n" }));
    assert.equal(result.current.ranges[0].start_line, 1400);
    assert.match(result.diff, /new decision/);
    assert.doesNotMatch(result.diff, /unrelated/);
});

test("removed functions retain their baseline implementation and explicitly unavailable current text", async () => {
    const result = await annotationCodeContext({ nodes: [] }, context({ ...selected, change: "removed", end_line: 2 }),
        async () => ({ current: null, base: "function merge() {\nreturn oldWinner;",
            diff: "@@ -1,2 +0,0 @@\n-function merge() {\n-return oldWinner;\n" }));
    assert.equal(result.subject_side, "base");
    assert.equal(result.current.available, false);
    assert.match(result.base.ranges[0].excerpt, /oldWinner/);
});

test("huge code is bounded, retains its tail, and names exact omitted ranges without truncating source lines", async () => {
    const source = `${text(2000, "long ".repeat(20))}\nreturn tailWinner;`;
    const result = await annotationCodeContext({ nodes: [] }, context({ ...selected, end_line: 2001 }),
        async () => ({ current: source, base: source, diff: "" }));
    assert.equal(result.current.complete, false);
    assert.ok(result.current.omitted_ranges.length);
    assert.match(result.current.ranges.map((range) => range.excerpt).join("\n"), /return tailWinner/);
    assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 48_000);
});

test("consumer, dependency and test implementations accompany static relationships", async () => {
    const nodes = [
        { id: "caller", name: "exportCitation", path: "caller.js", start_line: 1, end_line: 3 },
        { id: "helper", name: "normalize", path: "helper.js", start_line: 1, end_line: 2 },
        { id: "test", name: "testFallback", path: "tests/merge.test.js", start_line: 1, end_line: 3 },
    ];
    const data = context({ ...selected, end_line: 3 });
    data.related_edges = [
        { source: "caller", target: "function", type: "calls" },
        { source: "function", target: "helper", type: "calls" },
        { source: "test", target: "function", type: "calls" },
    ];
    const result = await annotationCodeContext({ nodes }, data,
        async (path) => ({ current: path.startsWith("tests/") ? "testFallback\nassert.equal(merge(), expected);\nend" : text(3),
            base: text(3), diff: "" }));
    assert.deepEqual(result.usages.map((item) => item.role), ["consumer", "dependency"]);
    assert.match(result.tests[0].ranges[0].excerpt, /assert\.equal/);
    assert.match(result.evidence_limits.note, /not executed tests/);
});

test("unresolved test references supply assertions without being promoted to proven linkage or execution", async () => {
    const model = { nodes: [], source_files: {
        "tests/merge.test.js": { current: "const actual = merge({ value: 1 });\nassert.equal(actual.value, 1);\n" },
    } };
    const result = await annotationCodeContext(model, context({ ...selected, end_line: 3 }),
        async () => ({ current: text(3), base: text(3), diff: "" }));
    assert.equal(result.tests[0].path, "tests/merge.test.js");
    assert.match(result.tests[0].relationship, /linkage and execution are not established/);
    assert.match(result.tests[0].ranges[0].excerpt, /assert\.equal/);
});

test("same-file callsites do not replace callee bodies, and imported constants and lexical flags are supplied", async () => {
    const subject = { ...selected, module_id: "module", start_line: 10, end_line: 12 };
    const model = { evidence: { call: { path: "a.js", line: 11 } }, nodes: [
        { id: "helper", name: "parseDetails", path: "a.js", start_line: 2, end_line: 5 },
        { id: "defaults", kind: "module", name: "defaults", path: "defaults.js" },
    ], edges: [{ source: "module", target: "defaults", type: "imports" }] };
    const data = context(subject);
    data.related_edges = [{ source: subject.id, target: "helper", type: "calls", evidence_ids: ["call"] }];
    const source = ["const AS_CITED = Symbol();", "function parseDetails(text) {", "if (!text.includes('cited:')) return null;",
        "return parsed;", "}", "", "", "", "", "function merge(ref) {", "parseDetails(ref.text);", "return ref[AS_CITED];"].join("\n");
    const result = await annotationCodeContext(model, data, async (path) =>
        ({ current: path === "defaults.js" ? "export const DEFAULT_RETRIES = 3;\n" : source, base: source, diff: "" }));
    const helper = result.usages.find((item) => item.name === "parseDetails");
    assert.equal(helper.complete, true);
    assert.match(helper.ranges[0].excerpt, /cited:/);
    assert.match(result.usages.find((item) => item.path === "defaults.js").ranges[0].excerpt, /DEFAULT_RETRIES = 3/);
    assert.match(result.declarations[0].ranges[0].excerpt, /AS_CITED = Symbol/);
});
