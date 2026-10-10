import { readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAX_TEMP_AGE_MS = 24 * 60 * 60 * 1000;
const TEMP_PREFIXES = [
    "agent-review-decisions-",
    "agent-review-dotnet-",
    "agent-review-snapshot-",
    "agent-review-index-",
    "agent-review-tests-",
    "agent-review-dotnet-tests-",
    "agent-review-go-tests-",
];
const REPOSITORY_PREFIXES = [".agent-review-node-tests-"];

async function pruneChildren(root, prefixes, cutoff) {
    let entries;
    try {
        entries = await readdir(root, { withFileTypes: true });
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
    const removed = [];
    for (const entry of entries) {
        if (!entry.isDirectory() || entry.isSymbolicLink()
            || !prefixes.some((prefix) => entry.name.startsWith(prefix))) continue;
        const path = join(root, entry.name);
        try {
            const details = await stat(path);
            const timestamp = Math.max(details.mtimeMs, details.birthtimeMs || 0);
            if (timestamp > cutoff) continue;
            await rm(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
            removed.push(path);
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
    }
    return removed;
}

export async function pruneStaleArtifacts(repoRoot, options = {}) {
    const now = options.now ?? Date.now();
    const maxAgeMs = options.maxAgeMs ?? MAX_TEMP_AGE_MS;
    if (!Number.isFinite(now) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) {
        throw new TypeError("Cleanup time and age must be finite non-negative values.");
    }
    const cutoff = now - maxAgeMs;
    const temporary = await pruneChildren(options.tempRoot || tmpdir(), TEMP_PREFIXES, cutoff);
    const repository = repoRoot ? await pruneChildren(repoRoot, REPOSITORY_PREFIXES, cutoff) : [];
    return { temporary, repository };
}
