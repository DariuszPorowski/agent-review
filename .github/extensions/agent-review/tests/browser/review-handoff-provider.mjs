import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReviewState } from "../../review-state.mjs";
import { startReviewServer } from "../../server.mjs";

const modelPath = process.env.AGENT_REVIEW_UX_MODEL;
if (!modelPath) throw new Error("Set AGENT_REVIEW_UX_MODEL to actual saved repository data.");
const model = JSON.parse(await readFile(modelPath, "utf8"));
const workspace = await mkdtemp(join(tmpdir(), "handoff-provider-contract-"));
const { chromium } = createRequire(process.env.AGENT_REVIEW_BROWSER_PACKAGE || import.meta.url)("playwright-core");
const calls = [];
const state = new ReviewState(model.metadata.repo_root, { workspacePath: workspace, runAnalyzer: async () => model,
    submitHandoffReview: async (input) => {
        calls.push(input);
        return { id: 7, state: "COMMENTED", commit: input.commit,
            url: "https://github.com/example/contract-only/pull/1#pullrequestreview-7" };
    } });
state.model = model;
state.reviewTarget = { mode: "pr", label: "CONTRACT TEST ONLY (not a live PR)",
    currentRef: model.metadata.head_sha, baseRef: model.metadata.base_sha,
    url: "https://github.com/example/contract-only/pull/1" };
const server = await startReviewServer(state);
const browser = await chromium.launch({ headless: true, executablePath: process.env.AGENT_REVIEW_BROWSER_EXECUTABLE || [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(existsSync) });
try {
    for (const theme of ["light", "dark"]) {
        let release;
        const delivered = new Promise((resolve) => { release = resolve; });
        state.submitHandoffReview = async (input) => {
            calls.push(input);
            await delivered;
            return { id: 7, state: "COMMENTED", commit: input.commit,
                url: "https://github.com/example/contract-only/pull/1#pullrequestreview-7" };
        };
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        let external = 0;
        await page.route("**/*", (route) => {
            const request = new URL(route.request().url());
            if (request.origin !== new URL(server.url).origin) { external++; return route.abort(); }
            if (request.pathname === "/api/review-targets") return route.fulfill({ status: 200,
                contentType: "application/json", body: '{"items":[],"page":0,"has_more":false}' });
            return route.continue();
        });
        const inView = (locator) => locator.evaluate((element) => {
            const box = element.getBoundingClientRect(), dialog = document.querySelector("#review-handoff").getBoundingClientRect();
            return box.top >= dialog.top && box.bottom <= dialog.bottom;
        });
        await page.goto(`${server.url}?scoutTheme=${theme}`);
        await page.locator("#workflow-finish").click();
        await page.getByRole("button", { name: "Preview / export handoff", exact: true }).click();
        await page.waitForFunction(() => !document.querySelector("#handoff-confirm").disabled);
        assert.equal(await page.locator("#handoff-submit").isDisabled(), true);
        const before = calls.length;
        const preview = await page.locator("#handoff-markdown").inputValue();
        assert.match(await page.locator("#handoff-provider").textContent(), /example\/contract-only/);
        await page.locator("#handoff-confirm").check();
        await page.locator("#handoff-submit").click();
        await page.locator("#handoff-provider-status").getByText(/Waiting for the provider receipt/).waitFor();
        assert.equal(await inView(page.locator("#handoff-provider-status")), true);
        assert.equal(await page.locator("#handoff-refresh").isDisabled(), true);
        release();
        await page.locator("#handoff-status").getByText(/Submitted comment-only review 7/).waitFor();
        assert.equal(await inView(page.locator("#handoff-provider-status")), true);
        assert.equal(calls.length, before + 1);
        assert.equal(calls.at(-1).body, preview);
        assert.equal(calls.at(-1).commit, model.metadata.head_sha);
        assert.equal(await page.locator("#handoff-submit").isDisabled(), true);
        if (process.env.AGENT_REVIEW_SCREENSHOT_DIR) {
            await mkdir(process.env.AGENT_REVIEW_SCREENSHOT_DIR, { recursive: true });
            await page.screenshot({ path: join(process.env.AGENT_REVIEW_SCREENSHOT_DIR, `provider-receipt-${theme}.png`) });
        }
        let releaseReopened;
        const reopenedReceipt = new Promise((resolve) => { releaseReopened = resolve; });
        state.submitHandoffReview = async () => {
            await reopenedReceipt;
            return { id: 8, state: "COMMENTED", commit: model.metadata.head_sha };
        };
        await page.locator("#handoff-refresh").click();
        await page.waitForFunction(() => !document.querySelector("#handoff-confirm").disabled);
        await page.locator("#handoff-confirm").check();
        await page.locator("#handoff-submit").click();
        await page.locator("#handoff-provider-status").getByText(/Waiting for the provider receipt/).waitFor();
        await page.locator("#handoff-close").click();
        await page.getByRole("button", { name: "Preview / export handoff", exact: true }).click();
        await page.locator("#handoff-status").getByText(/previous provider submission is still awaiting/).waitFor();
        assert.equal(await page.locator("#handoff-confirm").isDisabled(), true);
        if (process.env.AGENT_REVIEW_SCREENSHOT_DIR) {
            await page.screenshot({ path: join(process.env.AGENT_REVIEW_SCREENSHOT_DIR, `provider-reopened-pending-${theme}.png`) });
        }
        const settled = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/review-handoff/submit");
        releaseReopened();
        await settled;
        await page.waitForTimeout(50);
        assert.match(await page.locator("#handoff-status").textContent(), /previous provider submission is still awaiting/,
            "An old dialog receipt must not overwrite a newer preview.");
        state.submitHandoffReview = async () => { throw new Error("CONTRACT ONLY: outcome unknown. Check the PR before retrying."); };
        await page.locator("#handoff-refresh").click();
        await page.waitForFunction(() => !document.querySelector("#handoff-confirm").disabled);
        await page.locator("#handoff-confirm").check();
        await page.locator("#handoff-submit").click();
        await page.locator("#handoff-provider-error").getByText(/outcome unknown/).waitFor();
        assert.equal(await inView(page.locator("#handoff-provider-error")), true);
        assert.equal(await page.locator("#handoff-submit").isDisabled(), true);
        if (process.env.AGENT_REVIEW_SCREENSHOT_DIR) {
            await page.screenshot({ path: join(process.env.AGENT_REVIEW_SCREENSHOT_DIR, `provider-error-${theme}.png`) });
        }
        assert.equal(external, 0);
        await page.close();
        console.log(`PASS ${theme}: CONTRACT ONLY: confirmation, exact body, pinned commit, visible pending/receipt/error, one-shot. No GitHub request made.`);
    }
} finally {
    await browser.close();
    await server.close();
    await state.dispose();
    await rm(workspace, { recursive: true, force: true });
}
