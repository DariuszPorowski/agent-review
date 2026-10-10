import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReviewState } from "../../review-state.mjs";
import { startReviewServer } from "../../server.mjs";

const require = createRequire(process.env.AGENT_REVIEW_BROWSER_PACKAGE || import.meta.url);
const { chromium } = require("playwright-core");
const execute = promisify(execFile);
const repo = await mkdtemp(join(tmpdir(), "review-startup-selection-"));
const git = (...args) => execute("git", ["-C", repo, ...args]);
let browser;
try {
    await git("init", "-q");
    await git("config", "user.name", "Test");
    await git("config", "user.email", "test@example.invalid");
    await writeFile(join(repo, "main.py"), "def run():\n    return 1\n");
    await git("add", ".");
    await git("commit", "-qm", "baseline");
    await writeFile(join(repo, "main.py"), "def run():\n    return 2\n");
    const executablePath = process.env.AGENT_REVIEW_BROWSER_EXECUTABLE || [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ].find(existsSync);
    browser = await chromium.launch({ headless: true, executablePath });
    for (const theme of ["light", "dark"]) {
        const state = new ReviewState(repo, {
            baseRef: "HEAD",
            reviewTarget: { mode: "none", label: "Choose review target", currentRef: null },
        });
        const server = await startReviewServer(state);
        const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
        try {
            await page.goto(`${server.url}?scoutTheme=${theme}`);
            await page.waitForFunction(() => document.querySelector("#status")?.textContent === "Choose review");
            assert.equal(await page.locator("#review-mode").inputValue(), "");
            assert.match(await page.locator("#review-picker-notice").textContent(), /Choose Worktree, Commit, or Pull request/);
            assert.equal(await page.locator(".workspace").isVisible(), false);
            assert.equal(await page.locator("#analysis-progress").isVisible(), false);
            assert.equal(state.model, null);
            await page.waitForTimeout(500);
            assert.equal(state.model, null, "opening and connecting never starts analysis");

            await page.selectOption("#review-mode", "worktree");
            await page.waitForFunction(() => document.querySelector("#status")?.textContent === "Analysis current",
                null, { timeout: 120_000 });
            assert.ok(state.model, "selecting Worktree explicitly starts analysis");
            assert.equal(state.reviewTarget.mode, "worktree");
        } finally {
            await page.close();
            await server.close();
            await state.dispose();
        }
        console.log(`PASS ${theme}: startup stays idle until Worktree is selected`);
    }
} finally {
    await browser?.close();
    await rm(repo, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
