import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { pruneStaleArtifacts } from "../storage-cleanup.mjs";

test("startup cleanup removes only stale Agent Review-owned artifact directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-review-cleanup-test-"));
    const tempRoot = join(root, "temp");
    const repo = join(root, "repo");
    const stale = join(tempRoot, "agent-review-snapshot-stale");
    const fresh = join(tempRoot, "agent-review-tests-fresh");
    const unrelated = join(tempRoot, "other-tool-stale");
    const nodeStale = join(repo, ".agent-review-node-tests-stale");
    try {
        for (const directory of [stale, fresh, unrelated, nodeStale]) {
            await mkdir(directory, { recursive: true });
            await writeFile(join(directory, "data"), "owned");
        }
        const old = new Date("2026-10-01T00:00:00Z");
        const now = new Date("2026-10-12T00:00:00Z");
        await Promise.all([stale, unrelated, nodeStale].map((path) => utimes(path, old, old)));
        await utimes(fresh, now, now);
        const result = await pruneStaleArtifacts(repo, {
            tempRoot,
            now: now.getTime(),
            maxAgeMs: 24 * 60 * 60 * 1000,
        });
        assert.deepEqual(result.temporary, [stale]);
        assert.deepEqual(result.repository, [nodeStale]);
        await assert.rejects(statPath(stale), { code: "ENOENT" });
        await assert.rejects(statPath(nodeStale), { code: "ENOENT" });
        assert.equal(await readMarker(fresh), "owned");
        assert.equal(await readMarker(unrelated), "owned");
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

async function statPath(path) {
    const { stat } = await import("node:fs/promises");
    return stat(path);
}

async function readMarker(path) {
    const { readFile } = await import("node:fs/promises");
    return readFile(join(path, "data"), "utf8");
}
