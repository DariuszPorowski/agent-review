import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ReviewState } from "../../review-state.mjs";
import { repositoryRuleSources } from "../../review-contracts.mjs";
import { startReviewServer } from "../../server.mjs";

const results = process.env.AGENT_REVIEW_LARGE_RESULTS;
if (!results) throw new Error("Set AGENT_REVIEW_LARGE_RESULTS to saved live validation output.");
const { chromium } = createRequire(process.env.AGENT_REVIEW_BROWSER_PACKAGE || import.meta.url)("playwright-core");
const model = JSON.parse(await readFile(join(results, "model.json"), "utf8"));
const { result } = JSON.parse(await readFile(join(results, "review.json"), "utf8"));
const screenshots = join(results, "screenshots");
await mkdir(screenshots, { recursive: true });
const state = new ReviewState(model.metadata.repo_root, {
    runDecisions: async () => ({ status: "complete", callables: [] }), reviewLimits: { maxRequests: 2, timeoutMs: 5000 },
});
state.model = model;
state.reviewTarget = { mode: "commit", label: "Large validation change", currentRef: model.metadata.head_sha, baseRef: model.metadata.base_sha };
state.ruleCheck = { ...result, sources: repositoryRuleSources(model, { bounded: false }).map((source) => ({
    path: source.path, kind: source.kind, applicable_count: source.applies_to.length,
    changed_in_review: source.changed_in_review, truncated: false,
})) };
const server = await startReviewServer(state);
let browser;
try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.AGENT_REVIEW_BROWSER_EXECUTABLE || [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ].find(existsSync) });
    for (const theme of ["light", "dark"]) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${server.url}?scoutTheme=${theme}`);
        const panel = page.locator(".rule-check");
        await panel.waitFor();
        assert.match(await panel.textContent(), /642/);
        assert.match(await panel.textContent(), /supplied/);
        const proceed = panel.getByRole("button", { name: "Continue review", exact: true });
        if (await proceed.count()) {
            await proceed.focus();
            assert.equal(await proceed.evaluate((button) => button === document.activeElement), true);
        }
        await panel.screenshot({ path: join(screenshots, `large-review-${theme}.png`) });
        const citedFinding = result.findings[0] || result.unresolved_findings?.[0];
        if (citedFinding) {
            const citation = citedFinding.citations[0];
            const request = page.waitForRequest((request) => {
                const url = new URL(request.url());
                return url.pathname === "/api/source" && url.searchParams.get("path") === citation.path
                    && url.searchParams.get("side") === citation.side;
            });
            if (!result.findings.length) await panel.locator("summary").filter({ hasText: /candidate.*requiring verification/ }).click();
            await panel.locator(result.findings.length ? ".annotation-body .source-reference" : ".source-reference").first().click();
            await request;
            await page.locator("#source-panel").waitFor();
            await page.getByRole("button", { name: "Close source review", exact: true }).click();
        }
        await page.setViewportSize({ width: 390, height: 844 });
        const candidates = panel.locator("summary").filter({ hasText: /candidate.*requiring verification/ });
        if (await candidates.count() && await candidates.evaluate((summary) => summary.parentElement.open)) await candidates.click();
        await panel.scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
        await panel.screenshot({ path: join(screenshots, `large-review-${theme}-narrow.png`) });
        assert.deepEqual(errors, []);
        await page.close();
    }
    const page = await browser.newPage();
    await page.goto(server.url);
    let started;
    const ready = new Promise((resolve) => { started = resolve; });
    let cancelled = false;
    state.generateReviewPass = async (_context, { signal }) => {
        started();
        return new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => { cancelled = true; reject(signal.reason); }, { once: true });
        });
    };
    const panel = page.locator(".rule-check");
    await panel.getByRole("button", { name: "Continue review", exact: true }).click();
    await ready;
    await panel.getByRole("button", { name: "Stop AI review", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".rule-check .custom-status")?.textContent === "cancelled");
    assert.equal(cancelled, true);
    state.generateReviewPass = async (context) => ({
        completed: context.units.map((unit) => unit.id), observations: [], findings: [], unresolved: [], requests: [],
        ...(context.phase === "verify" ? { decisions: context.candidates.map((candidate) => ({
            id: candidate.id, verdict: "supported", title: candidate.title, detail: candidate.detail,
            reason: "Execution-control test provider.", citations: candidate.citations,
        })) } : {}),
    });
    await panel.getByRole("button", { name: "Continue review", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".rule-check .custom-status")?.textContent === "partial");
    console.log(`Validated real large-project UI: light/dark, narrow, keyboard focus, source side, stop and continue. Screenshots: ${screenshots}`);
} finally {
    await browser?.close();
    await state.dispose();
    await server.close();
}
