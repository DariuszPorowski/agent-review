import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ReviewState } from "../review-state.mjs";
import { buildReviewPrompt, reviewResponseSchema, validateReviewResponse, runReview } from "../review-pipeline.mjs";
import { repositoryRuleSources } from "../review-contracts.mjs";
import { managedCopilotPath } from "../managed-copilot.mjs";

const repo = process.env.AGENT_REVIEW_LARGE_REPO;
const sdk = process.env.AGENT_REVIEW_SDK_MODULE;
const output = process.env.AGENT_REVIEW_VALIDATION_OUTPUT;
if (!repo || !sdk || !output) throw new Error("Set AGENT_REVIEW_LARGE_REPO, AGENT_REVIEW_SDK_MODULE, and AGENT_REVIEW_VALIDATION_OUTPUT.");
const { CopilotClient, RuntimeConnection } = await import(pathToFileURL(resolve(sdk)).href);
await mkdir(output, { recursive: true });
const client = new CopilotClient({
    connection: RuntimeConnection.forStdio({ path: await managedCopilotPath(), args: ["--server", "--stdio", "--no-auto-update"] }),
    workingDirectory: repo, logLevel: "error",
});
let state;
try {
    await client.start();
    state = new ReviewState(repo, { baseRef: "main", runDecisions: async () => ({ status: "complete", callables: [] }),
        reviewDirectory: join(output, "checkpoints"),
        reviewLimits: { timeoutMs: Number(process.env.AGENT_REVIEW_VALIDATION_BUDGET_MS || 600_000) } });
    state.subscribe((event) => {
        if (event.type === "progress") console.log(JSON.stringify({ analyzer: event.progress }));
    });
    await state.setReviewTarget({ mode: "commit", ref: "large-change", baseRef: "main" });
    const changed = state.model.changes.filter((file) => file.status !== "unchanged");
    assert.ok(changed.length > 500, `Expected more than 500 changed files, got ${changed.length}`);
    const allocation = await runReview({ model: state.model, instruction: "Validate scheduling and source coverage.",
        sources: repositoryRuleSources(state.model, { bounded: false }), limits: { maxRequests: 1000 },
        generate: async (context) => ({
            completed: context.units.map((unit) => unit.id), observations: [], findings: [], unresolved: [], requests: [],
        }) });
    assert.equal(allocation.coverage.completed_files, changed.length, JSON.stringify(allocation.gaps));
    await writeFile(join(output, "allocation.json"), JSON.stringify(allocation, null, 2));
    console.log(JSON.stringify({ allocation: allocation.coverage }));
    const stats = [];
    state.generateReviewPass = async (context, { signal }) => {
        const started = Date.now();
        const session = await client.createSession({ availableTools: [], excludedTools: ["builtin:*", "mcp:*", "custom:*"],
            onPermissionRequest: () => ({ kind: "reject", feedback: "Saved evidence only." }) });
        const abort = () => void session.abort();
        signal.addEventListener("abort", abort, { once: true });
        try {
            signal.throwIfAborted();
            const response = await session.sendAndWait({ prompt: buildReviewPrompt(context),
                responseSchema: reviewResponseSchema(context) }, 120_000);
            if (response?.data?.toolRequests?.length) throw new Error("Review attempted tool access.");
            const validated = validateReviewResponse(response?.data?.content, context);
            stats.push({ phase: context.phase, units: context.units.length, characters: JSON.stringify(context).length,
                milliseconds: Date.now() - started, findings: validated.findings.length, requests: validated.requests.length });
            console.log(JSON.stringify(stats.at(-1)));
            return validated;
        } finally {
            signal.removeEventListener("abort", abort);
            await session.disconnect();
        }
    };
    state.subscribe((event) => {
        if (event.type === "rule-check-progress") console.log(JSON.stringify({ progress: event.rule_check.coverage }));
    });
    const result = await state.runRuleCheck({ force: true });
    await writeFile(join(output, "review.json"), JSON.stringify({ result, stats }, null, 2));
    await writeFile(join(output, "model.json"), JSON.stringify(state.model));
    assert.ok(["complete", "partial"].includes(result.status), result.error);
    assert.ok(result.coverage.completed_files > 0, "No real analysis completed.");
    assert.ok(result.findings.some((item) => /retry|attempt|inherit/i.test(`${item.title} ${item.detail}`)), "Missed planted retry regression.");
    assert.ok(result.findings.some((item) => /unit|second|minute|duration|60/i.test(`${item.title} ${item.detail}`)), "Missed planted duration regression.");
    console.log(`Validated ${result.coverage.completed_files}/${changed.length} changed files; ${result.findings.length} findings.`);
    console.log(await readFile(join(output, "review.json"), "utf8").then(() => `Results: ${output}`));
} finally {
    await state?.dispose();
    await client.stop();
}
