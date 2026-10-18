import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
process.env.AGENT_REVIEW_CACHE_DIR = join(root, ".agent-review", "cache");
process.env.AGENT_REVIEW_DOTNET_CACHE = join(root, ".agent-review", "cache", "dotnet-facts");
process.env.NUGET_PACKAGES = join(root, ".local-nuget");
process.env.DOTNET_CLI_HOME = join(root, ".local-dotnet");
process.env.DOTNET_GENERATE_ASPNET_CERTIFICATE = "false";
process.env.DOTNET_CLI_TELEMETRY_OPTOUT = "1";
process.env.DOTNET_CLI_USE_MSBUILD_SERVER = "0";
process.env.MSBUILDDISABLENODEREUSE = "1";
if (!process.argv[2] || process.argv[2].startsWith("--")) {
    throw new Error("Usage: node Verify-AgentReview.mjs <agent-review-extension-directory> [--run-tests]");
}
const extension = resolve(process.argv[2]);
const { ReviewState } = await import(pathToFileURL(join(extension, "review-state.mjs")).href);
const state = new ReviewState(root, { baseRef: "HEAD" });
try {
    await state.refresh();
    assert.equal(state.error, null);
    await state.decisionMapFor(120_000);
    assert.equal(state.decisionMap.status, "complete");
    assert.equal(state.model.coverage.available, true);
    const plan = await state.testRunPlan();
    assert.equal(plan.available, true, JSON.stringify(plan));
    let run = null;
    if (process.argv.includes("--run-tests")) {
        await state.runLinkedTests();
        run = await state.testRunPromise;
        assert.equal(run.status, "complete", run.error || run.output);
        assert.equal(run.counts.failed, 0, run.output);
        assert.deepEqual(run.executed, {});
    }
    const report = {
        repository: root,
        baseline: state.model.metadata.base_sha,
        summary: state.model.summary,
        symbols: state.model.symbols.length,
        graph_edges: state.model.edges.length,
        current_calls: state.model.edges.filter((edge) => edge.type === "calls" && edge.change !== "removed").length,
        package_versions: state.model.package_dependencies.map((item) => ({
            name: item.name, ecosystem: item.ecosystem, version: item.resolved_current,
        })),
        coverage: state.model.coverage,
        code_paths: { totals: state.decisionMap.totals, callables: state.decisionMap.callables.length,
            tests: state.decisionMap.verification.tests.length,
            entries: state.decisionMap.callables.flatMap((item) => item.entries.map((entry) => ({
                callable: item.qualname, path: item.path, status: entry.status,
                line: entry.decision.line, outcome: entry.decision.outcome, value: entry.decision.value,
                evidence: entry.evidence,
            }))) },
        test_plan: plan,
        test_run: run && { status: run.status, counts: run.counts,
            executed: run.executed, limitation: run.path_evidence_limitation },
        warnings: state.model.warnings,
    };
    console.log(JSON.stringify(report, null, 2));
} finally {
    await state.dispose();
}
