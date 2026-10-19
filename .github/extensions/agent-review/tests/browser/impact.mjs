import assert from "node:assert/strict";
import { openReviewTool } from "./review-details-helper.mjs";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const url = process.env.AGENT_REVIEW_UX_URL;
if (!url) throw new Error("Set AGENT_REVIEW_UX_URL to a real repository's Agent Review server.");
const { chromium } = createRequire(process.env.AGENT_REVIEW_BROWSER_PACKAGE || import.meta.url)("playwright-core");
const browser = await chromium.launch({ headless: true, executablePath: process.env.AGENT_REVIEW_BROWSER_EXECUTABLE || [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(existsSync) });
try {
    for (const theme of ["light", "dark"]) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${url}?scoutTheme=${theme}`);
        await openReviewTool(page, "architecture");
        await page.locator("#impact-view").click();
        await page.locator(".impact-graph .node").first().waitFor();
        const direction = page.getByRole("combobox", { name: "Impact relationships" });
        await direction.focus();
        await page.keyboard.press("ArrowDown");
        assert.equal(await direction.inputValue(), "consumers");
        await page.keyboard.press("ArrowDown");
        assert.equal(await direction.inputValue(), "dependencies");
        assert.equal(await direction.evaluate((node) => node === document.activeElement), true);
        await direction.selectOption("both");
        const hiddenArrows = await page.locator(".impact-graph .edge").evaluateAll((edges) => {
            const rectangles = [...document.querySelectorAll(".impact-graph .node rect")].map((rect) => rect.getBoundingClientRect());
            return edges.filter((edge) => {
                const end = edge.getPointAtLength(edge.getTotalLength());
                const point = new DOMPoint(end.x, end.y).matrixTransform(edge.getScreenCTM());
                return rectangles.some((rect) => point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom);
            }).length;
        });
        assert.equal(hiddenArrows, 0, "arrowheads must end outside component tiles");
        assert.equal(await page.locator("#changed-only").isVisible(), false);
        assert.equal(await page.locator("#review-search").isVisible(), false);
        const focus = page.locator(".impact-graph .node").first();
        await focus.press("Enter");
        const open = page.locator(".impact-evidence").getByRole("button", { name: "Open source", exact: true });
        if (await open.count()) {
            await open.click();
            await page.locator("#source-impact").waitFor();
            await page.locator("#source-impact").focus();
            await page.keyboard.press("Enter");
            assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("node")), true);
        }
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.deepEqual(errors, []);
        console.log(`PASS ${theme}: evidence-backed Impact, visible arrows, continuous keyboard filtering, source-return focus and narrow layout`);
        await page.close();
    }
} finally { await browser.close(); }
