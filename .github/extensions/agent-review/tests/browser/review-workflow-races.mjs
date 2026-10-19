import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const url = process.env.AGENT_REVIEW_UX_URL;
if (!url) throw new Error("Set AGENT_REVIEW_UX_URL to an actual saved review.");
const endpoint = new URL("/api/review-progress", url);
const original = await fetch(endpoint).then((response) => response.json());
const { chromium } = createRequire(process.env.AGENT_REVIEW_BROWSER_PACKAGE || import.meta.url)("playwright-core");
const browser = await chromium.launch({ headless: true, executablePath: process.env.AGENT_REVIEW_BROWSER_EXECUTABLE || [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(existsSync) });
const restore = async (entries = original.entries, cursor = original.cursor) => {
    const record = await fetch(endpoint).then((response) => response.json());
    const result = await fetch(endpoint, { method: "POST", body: JSON.stringify({
        snapshot: record.snapshot, revision: record.revision, entries, cursor,
    }) });
    assert.equal(result.status, 200);
};
try {
    await restore({}, null);
    for (const theme of ["light", "dark"]) for (const destination of ["finish", "overview"]) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        let started, release;
        const captured = new Promise((resolve) => { started = resolve; });
        const resumed = new Promise((resolve) => { release = resolve; });
        await page.route("**/api/source?*", async (route) => {
            const response = await route.fetch();
            started();
            await resumed;
            await route.fulfill({ response });
        });
        await page.goto(`${url}?scoutTheme=${theme}`);
        await page.locator("#overview-start").click();
        await captured;
        await page.locator(`#workflow-${destination}`).click();
        const target = page.locator(destination === "finish" ? "#review-finish" : "#review-overview");
        await target.waitFor();
        const delivered = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/source");
        release();
        await delivered;
        await page.waitForTimeout(1200);
        assert.equal(await target.isVisible(), true, "A late genuine source response must not undo explicit workflow navigation.");
        assert.equal(await page.locator("#source-panel").isVisible(), false);
        assert.equal(await page.locator(`#workflow-${destination}`).getAttribute("aria-current"), "page");
        await page.close();
        console.log(`PASS ${theme}: delayed real source response cannot replace ${destination}`);
    }
} finally { await browser.close(); await restore(); }
