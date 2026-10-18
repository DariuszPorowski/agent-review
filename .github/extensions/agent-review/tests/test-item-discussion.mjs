import assert from "node:assert/strict";
import test from "node:test";
import { answerDiscussion, discussionContext, discussionPrompt, validateDiscussionResponse } from "../item-discussion.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReviewState } from "../review-state.mjs";

const model = { nodes: [], edges: [], evidence: {}, source_files: { "a.js": { current: "export const value = 1;\n" } } };
const context = { item: { id: "file:a.js", path: "a.js", name: "a.js" } };
test("discussion context is bounded and source citations must be supplied", () => {
    const input = discussionContext(model, context, [], "Explain.");
    assert.equal(input.evidence[0].path, "a.js");
    assert.throws(() => validateDiscussionResponse({
        answer: "Claim", limitation: "", citations: [{ evidence_id: input.evidence[0].id, line: 500 }], requests: [],
    }, input), /not supplied/);
});
test("package attention questions retain the exact dependency identity and declarations", () => {
    const state = new ReviewState("C:\\repo");
    state.model = { ...model, attention: [{ id: "finding", package_id: "package:npm:example", title: "Package dependency added" }],
        package_changes: [{ id: "package:npm:example", name: "example", resolved_current: "1.2.3",
            declared_current: [{ source: "package.json", line: 2, specifier: "^1.2.3" }] }] };
    const context = state.contextFor("finding");
    assert.equal(context.subject.name, "example");
    const input = discussionContext(state.model, context, [], "Why this dependency?");
    assert.equal(input.item.package, "example");
    assert.equal(input.item.current_version, "1.2.3");
});
test("sampled section context never describes unprovided excerpts as missing saved files", () => {
    const paths = Array.from({ length: 90 }, (_, index) => `modules/route-${index}/adapter.js`);
    const reviewed = { ...model, source_files: { ...model.source_files,
        ...Object.fromEntries(paths.map((path) => [path, { current: "same analyzed function" }])) } };
    const input = discussionContext(reviewed, { ...context, section: {
        title: "Update adapters", ranges: paths.map((path) => ({ path, line: 1, end_line: 1, side: "current" })),
    } }, [], "Does grouping prove identical policies?");
    assert.equal(input.snapshot_availability.saved_files, 91);
    assert.equal(input.snapshot_availability.section_files, 90);
    assert.equal(input.snapshot_availability.section_files_present, 90);
    assert.equal(input.snapshot_availability.section_filename_counts["adapter.js"], 90);
    assert.ok(new Set(input.evidence.map((item) => item.path)).size < 90);
    assert.equal(input.section.omitted_range_catalog_entries, 50);
    assert.match(discussionPrompt(input), /not absent from the repository or snapshot/);
});
test("discussion retrieves unchanged saved code without executing it", async () => {
    let calls = 0;
    const result = await answerDiscussion({ model: { ...model, source_files: { ...model.source_files, "b.js": { current: "unchanged helper" } } },
        context, history: [], question: "Explain the helper.", onActivity: () => {},
        generate: async (input) => {
            calls++;
            if (calls === 1) return { answer: "", limitation: "", citations: [], requests: [
                { path: "b.js", side: "current", start_line: 1, end_line: 1 },
            ] };
            const evidence = input.evidence.find((item) => item.path === "b.js");
            return { answer: "The helper is unchanged.", limitation: "Execution is not established.",
                citations: [{ evidence_id: evidence.id, line: 1 }], requests: [] };
        } });
    assert.equal(result.content, "The helper is unchanged.");
    assert.equal(calls, 2);
});
test("large source requests are bounded internally rather than failing the user's question", async () => {
    let calls = 0;
    const longModel = { ...model, source_files: { ...model.source_files,
        "long.js": { current: Array.from({ length: 500 }, (_, index) => `line ${index + 1}`).join("\n") } } };
    const result = await answerDiscussion({ model: longModel, context, history: [], question: "Inspect the full range.", onActivity: () => {},
        generate: async (input) => {
            if (++calls === 1) return { answer: "", limitation: "", citations: [],
                requests: [{ path: "./long.js", side: "current", start_line: 1, end_line: 500 }] };
            const last = input.evidence.find((item) => item.path === "long.js" && item.lines.some((line) => line.line === 500));
            assert.ok(last, "the tail of the requested range was supplied");
            return { answer: "The requested tail is present.", limitation: "",
                citations: [{ evidence_id: last.id, line: 500 }], requests: [] };
        } });
    assert.equal(result.content, "The requested tail is present.");
});
test("invalid model ranges receive a bounded correction attempt instead of becoming an immediate UX failure", async () => {
    let calls = 0;
    const result = await answerDiscussion({ model, context, history: [], question: "Explain.", onActivity: () => {},
        generate: async (input) => {
            if (++calls === 1) return { answer: "", limitation: "", citations: [],
                requests: [{ path: "a.js", side: "current", start_line: 0, end_line: 1 }] };
            assert.match(input.validation_error, /1-based/);
            return { answer: "The saved value is one.", limitation: "",
                citations: [{ evidence_id: input.evidence[0].id, line: 1 }], requests: [] };
        } });
    assert.equal(result.content, "The saved value is one.");
    assert.equal(calls, 2);
});
test("cancellation reaches the model provider", async () => {
    const controller = new AbortController();
    let stopped = false;
    const pending = answerDiscussion({ model, context, history: [], question: "Explain.", signal: controller.signal,
        onActivity: () => {}, generate: async (_input, { signal }) => {
            signal.addEventListener("abort", () => { stopped = true; });
            controller.abort(new Error("Stopped"));
            return new Promise(() => {});
        } });
    await assert.rejects(pending, /Stopped/);
    assert.equal(stopped, true);
});

test("item conversations persist and never silently follow another snapshot", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "review-discussion-"));
    const reviewed = () => ({ ...model, metadata: { head_sha: "one" }, changes: [
        { path: "a.js", status: "modified", lines_added: 1, lines_removed: 1 },
    ], attention: [], warnings: [], coverage: {} });
    try {
        const state = new ReviewState("C:\\repo", { workspacePath: workspace,
            generateDiscussion: async (input) => ({ answer: "The saved value is one.", limitation: "No tests were run.",
                citations: [{ evidence_id: input.evidence[0].id, line: 1 }], requests: [] }) });
        state.model = reviewed();
        const thread = await state.askDiscussion({ id: "file:a.js", question: "What changed?" });
        await state.discussionRuns.get(thread.id);
        assert.equal(thread.messages[1].status, "complete");
        const restored = new ReviewState("C:\\repo", { workspacePath: workspace });
        restored.model = reviewed();
        assert.equal((await restored.discussionFor("file:a.js")).messages[1].content, "The saved value is one.");
        restored.model = { ...reviewed(), metadata: { head_sha: "two" } };
        const newer = await restored.discussionFor("file:a.js");
        assert.notEqual(newer.id, thread.id);
        assert.deepEqual(newer.messages, []);
        assert.equal(thread.commit, "one");
    } finally { await rm(workspace, { recursive: true, force: true }); }
});
test("questions carry validated viewed ranges without changing their pinned item", async () => {
    const state = new ReviewState("C:\\repo", { generateDiscussion: async (input) => {
        assert.deepEqual(input.viewed_location, { path: "a.js", line: 1, side: "base" });
        const evidence = input.evidence.find((item) => item.side === "base");
        return { answer: "This is the saved base.", limitation: "",
            citations: [{ evidence_id: evidence.id, line: 1 }], requests: [] };
    } });
    state.model = { ...model, source_files: { "a.js": { current: "new", baseline: "old" } },
        metadata: {}, changes: [{ path: "a.js", status: "modified" }] };
    const thread = await state.askDiscussion({ id: "file:a.js", question: "What is this line?",
        location: { path: "a.js", line: 1, side: "base" } });
    await state.discussionRuns.get(thread.id);
    assert.equal(thread.messages.at(-1).status, "complete");
    assert.equal(thread.item_id, "file:a.js");
    assert.equal(thread.messages[0].location.side, "base");
    await assert.rejects(state.askDiscussion({ id: "file:a.js", question: "Nope",
        location: { path: "../outside.js", line: 1, side: "current" } }), /saved source range/);
});

test("an item accepts only one active generation, and stop preserves an explicit stopped answer", async () => {
    const state = new ReviewState("C:\\repo", { generateDiscussion: async () => new Promise(() => {}) });
    state.model = { ...model, metadata: {}, changes: [{ path: "a.js", status: "modified" }] };
    const [first, second] = await Promise.allSettled([
        state.askDiscussion({ id: "file:a.js", question: "Explain." }),
        state.askDiscussion({ id: "file:a.js", question: "Explain again." }),
    ]);
    assert.equal([first, second].filter((item) => item.status === "fulfilled").length, 1);
    const thread = (first.status === "fulfilled" ? first : second).value;
    state.stopInternalReviews(`discussion:${thread.id}`);
    await state.discussionRuns.get(thread.id);
    assert.equal(thread.messages[1].status, "stopped");
    assert.ok(thread.messages[1].error);
});
