import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ReviewState } from "../../review-state.mjs";
import { startReviewServer } from "../../server.mjs";

const results = process.env.AGENT_REVIEW_LARGE_RESULTS;
if (!results) throw new Error("Set AGENT_REVIEW_LARGE_RESULTS to saved real large-repository validation results.");
const { chromium } = createRequire(process.env.AGENT_REVIEW_BROWSER_PACKAGE || import.meta.url)("playwright-core");
const model = JSON.parse(await readFile(join(results, "model.json"), "utf8"));
const state = new ReviewState(model.metadata.repo_root, { readWorktreeFingerprint: null });
state.model = model;
state.reviewTarget = { mode: "commit", currentRef: model.metadata.head_sha, baseRef: model.metadata.base_sha, label: "Large-source performance validation" };
const nodes = new Map(model.nodes.map((node) => [node.id, node]));
const largePath = Object.entries(model.source_files).sort((a, b) => (b[1].diff?.length || 0) - (a[1].diff?.length || 0))[0][0];
const largeItems = model.attention.filter((item) => nodes.get(item.node_id)?.path === largePath).slice(0, 2);
const smallItem = model.attention.find((item) => nodes.get(item.node_id)?.path !== largePath);
assert.equal(largeItems.length, 2, "Need two attention items pointing into the same large source.");
assert.ok(smallItem);
state.annotations.overview = { body: "## Summary\n\nSaved real repository data.\n\n## Review order\n\nReview changed source.\n\n## Gaps\n\nPerformance validation only." };
for (const item of [...largeItems, smallItem]) state.annotations[item.id] = {
    body: "## What changed\n\nPerformance checks use the saved source, not model-generated findings.",
};
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
        await page.addInitScript(() => {
            window.sourceLongTasks = [];
            new PerformanceObserver((list) => {
                window.sourceLongTasks.push(...list.getEntries().map((entry) => entry.duration));
            }).observe({ type: "longtask" });
        });
        await page.goto(`${server.url}?scoutTheme=${theme}`);
        const select = async (item) => {
            const card = page.locator(`#attention .review-card[data-item-id="${item.id}"]`);
            await card.waitFor();
            const response = page.waitForResponse((response) =>
                new URL(response.url()).pathname === "/api/source"
                && new URL(response.url()).searchParams.get("id") === item.id);
            const started = performance.now();
            await card.evaluate((card) => card.click());
            const source = await (await response).json();
            const title = `${source.path}${source.start_line ? `:${source.start_line}` : ""}`;
            await page.waitForFunction((title) => document.querySelector("#source-title")?.textContent === title
                && document.querySelector("#source")?.getAttribute("aria-busy") !== "true"
                && document.querySelector("#source .code-row"), title);
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            return Math.round(performance.now() - started);
        };
        const coldMs = await select(largeItems[0]);
        await page.locator("#source").evaluate((source) => { window.savedChangeRow = source.querySelector(".diff-add"); });
        const switches = [];
        const profiler = process.env.AGENT_REVIEW_PROFILE ? await page.context().newCDPSession(page) : null;
        if (profiler) {
            await profiler.send("Profiler.enable");
            await profiler.send("Profiler.start");
        }
        for (const item of [largeItems[1], smallItem, largeItems[0], largeItems[1]]) switches.push(await select(item));
        if (profiler) {
            const { profile } = await profiler.send("Profiler.stop");
            console.log(JSON.stringify({ profile: profile.nodes.filter((node) => node.hitCount)
                .sort((a, b) => b.hitCount - a.hitCount).slice(0, 18)
                .map((node) => ({ function: node.callFrame.functionName, hits: node.hitCount,
                    line: node.callFrame.lineNumber, ticks: node.positionTicks })) }));
        }
        console.log(JSON.stringify({ theme, coldMs, switches }));
        assert.equal(await page.locator("#source").evaluate((source) =>
            source.querySelector(".diff-add") === window.savedChangeRow), true, "attention switches reuse unchanged source rows");
        assert.ok(Math.max(...switches) < 1000, `Warm attention switches should stay below 1s: ${switches}`);
        const rows = await page.locator("#source .code-row").count();
        assert.ok(rows > 20_000, `Expected the real oversized view, got ${rows} rows`);
        const longTasks = await page.evaluate(() => window.sourceLongTasks);
        assert.ok(Math.max(0, ...longTasks) < 250, `Source navigation blocked the UI: ${longTasks}`);
        const attention = await page.locator(`#attention .review-card[data-item-id="${largeItems[1].id}"]`).elementHandle();
        const rootBeforeAnnotation = await page.locator("#source .code-lines").elementHandle();
        state.broadcast("annotation");
        await page.waitForTimeout(50);
        assert.equal(await attention.evaluate((card) => card.isConnected), true,
            "annotation updates do not rebuild the attention list");
        assert.equal(await rootBeforeAnnotation.evaluate((lines) => lines.isConnected), true,
            "annotation updates do not rebuild the selected source");
        const toggles = [];
        for (let index = 0; index < 4; index++) {
            const result = await page.locator("#source .diff-gap-toggle").first().evaluate(async (row) => {
                const source = document.querySelector("#source");
                const lines = source.firstElementChild;
                const untouched = source.querySelector(".diff-add");
                const annotation = document.querySelector("#source-annotation").firstElementChild;
                row.focus({ preventScroll: true });
                const before = { top: source.scrollTop, left: source.scrollLeft };
                const started = performance.now();
                row.click();
                const handlerMs = performance.now() - started;
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                return {
                    handlerMs, paintMs: performance.now() - started,
                    sameRoot: source.firstElementChild === lines,
                    sameUntouched: source.querySelector(".diff-add") === untouched,
                    sameAnnotation: document.querySelector("#source-annotation").firstElementChild === annotation,
                    focus: document.activeElement === row,
                    scroll: source.scrollTop === before.top && source.scrollLeft === before.left,
                };
            });
            assert.ok(result.sameRoot && result.sameUntouched && result.sameAnnotation, "gap toggles must not rebuild the source or side panels");
            assert.ok(result.focus && result.scroll, "gap toggles preserve focus and scroll");
            assert.ok(result.handlerMs < 250 && result.paintMs < 500,
                `Gap toggle budget exceeded: ${JSON.stringify(result)}`);
            toggles.push({ handlerMs: Math.round(result.handlerMs), paintMs: Math.round(result.paintMs) });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator("#source .diff-gap-toggle").first().focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#source .diff-gap-toggle").first().getAttribute("aria-expanded"), "true");
        await page.keyboard.press(" ");
        assert.equal(await page.locator("#source .diff-gap-toggle").first().getAttribute("aria-expanded"), "false");
        assert.equal(await page.locator("#source-ruler .ruler-mark").count() > 0, true);
        let releaseOldSource;
        let sawOldSource;
        const oldSourceStarted = new Promise((resolve) => { sawOldSource = resolve; });
        await page.route("**/api/source?**", async (route) => {
            if (new URL(route.request().url()).searchParams.get("id") !== largeItems[0].id) return route.continue();
            const response = await route.fetch();
            sawOldSource();
            await new Promise((resolve) => { releaseOldSource = resolve; });
            await route.fulfill({ response });
        });
        await page.locator(`#attention .review-card[data-item-id="${largeItems[0].id}"]`).evaluate((card) => card.click());
        await oldSourceStarted;
        await select(smallItem);
        releaseOldSource();
        await page.waitForTimeout(50);
        assert.ok((await page.locator("#source-title").textContent()).startsWith(nodes.get(smallItem.node_id).path),
            "a slower prior selection cannot replace the latest item");
        await page.unroute("**/api/source?**");
        await select(largeItems[1]);
        const screenshots = join(results, "screenshots");
        await mkdir(screenshots, { recursive: true });
        await page.locator("#source-panel").screenshot({ path: join(screenshots, `large-source-performance-${theme}.png`) });
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ theme, rows, coldMs, warmSwitchMs: switches, longestTaskMs: Math.max(0, ...longTasks), toggles }));
        await page.close();
    }
} finally {
    await browser?.close();
    await state.dispose();
    await server.close();
}
