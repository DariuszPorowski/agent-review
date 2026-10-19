import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReviewState } from "../../review-state.mjs";
import { startReviewServer } from "../../server.mjs";

if (!process.env.AGENT_REVIEW_LARGE_RESULTS) throw new Error("Set AGENT_REVIEW_LARGE_RESULTS to real saved repository results.");
const model = JSON.parse(await readFile(join(process.env.AGENT_REVIEW_LARGE_RESULTS, "model.json"), "utf8"));
const { chromium } = createRequire(process.env.AGENT_REVIEW_BROWSER_PACKAGE || import.meta.url)("playwright-core");
const workspace = await mkdtemp(join(tmpdir(), "explanation-depth-"));
const body = "## What this code is\n\nA saved contract.\n\n## How the rest of the code uses it\n\n- A static consumer.\n\n"
    + "## What changed and how behavior changes\n\n**Before → After:** the precedence order changes.\n\n**Execution order**\n\n"
    + "1. A bypass returns cited values before corrections.\n\n2. Otherwise select a correction, then a fallback.\n\n"
    + "**Example (derived from source, not executed):** a supplied correction wins over the default.\n\n"
    + "## Why it changed\n\nIntent is not established by this rendering fixture.\n\n"
    + "## Risk and review focus\n\n**Risk: Medium — Validate conflicting inputs.**\n\n- **Verify:** the saved boundaries.";
let browser, server, state;
try {
    let discussions = 0;
    state = new ReviewState(model.metadata.repo_root, { workspacePath: workspace, readWorktreeFingerprint: null,
        getHistoricalSessionContexts: async () => ({ contexts: [], failures: [] }),
        generateAnnotation: async () => body,
        generateDiscussion: async () => { discussions++; throw new Error("This UI regression must not send a question."); } });
    state.model = model;
    state.reviewTarget = { mode: "commit", currentRef: model.metadata.head_sha, baseRef: model.metadata.base_sha };
    state.annotations.overview = { body: "## Summary\n\nSaved repository data.\n\n## Review order\n\nInspect source.\n\n## Gaps\n\nRendering fixture only." };
    server = await startReviewServer(state);
    browser = await chromium.launch({ headless: true, executablePath: process.env.AGENT_REVIEW_BROWSER_EXECUTABLE || [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ].find(existsSync) });
    for (const theme of ["light", "dark"]) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${server.url}?scoutTheme=${theme}`);
        await page.locator("#attention .review-card").first().click();
        const annotation = page.locator("#source-annotation");
        await annotation.locator(".annotation-deepen").waitFor();
        assert.match(await annotation.locator(".annotation-body > p").first().textContent(), /Before.*After/);
        assert.deepEqual(await annotation.locator(".annotation-body > ol").evaluateAll((lists) => lists.map((list) => list.start)), [1, 2]);
        assert.equal(await annotation.locator(".annotation-more").evaluate((details) => details.open), false);
        await annotation.getByText("Full explanation", { exact: true }).click();
        assert.equal(await annotation.locator(".annotation-more").evaluate((details) => details.open), true);
        await annotation.getByRole("button", { name: "Ask for a deeper walkthrough", exact: true }).click();
        const input = page.locator("#item-question");
        await input.waitFor();
        assert.match(await input.inputValue(), /precedence and fallbacks/);
        await input.fill("Keep this existing draft.");
        await page.getByRole("button", { name: "Evidence", exact: true }).click();
        await page.setViewportSize({ width: 390, height: 844 });
        await annotation.getByRole("button", { name: "Ask for a deeper walkthrough", exact: true }).click();
        assert.equal(await input.inputValue(), "Keep this existing draft.");
        await page.locator("#item-discussion").getByText(/Your existing draft was kept/).waitFor();
        assert.equal(discussions, 0, "requesting more detail must not send or charge for a question automatically");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.deepEqual(errors, []);
        await page.close();
        console.log(`PASS ${theme}: visible mechanism, numbered steps, full detail, deeper-question prefill, retained draft and narrow layout`);
    }
} finally {
    await browser?.close();
    await state?.dispose();
    await server?.close();
    await rm(workspace, { recursive: true, force: true });
}
