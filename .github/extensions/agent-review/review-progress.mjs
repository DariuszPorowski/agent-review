import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseReviewLedger } from "./web/review-ledger.mjs";

export function validateReviewEntries(entries) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) throw new Error("Review progress entries must be an object.");
    for (const entry of Object.values(entries)) {
        if (entry?.line != null && (!Number.isSafeInteger(entry.line) || entry.line < 1)
            || entry?.path != null && typeof entry.path !== "string") throw new Error("Invalid review progress location.");
    }
    const parsed = parseReviewLedger(JSON.stringify(entries));
    if (parsed.size > 3000) throw new Error("Review progress exceeds its 3000-record limit.");
    for (const [id, entry] of parsed) {
        if (!id || id.length > 2000 || entry.note.length > 500 || entry.path.length > 2000
            || (entry.line !== null && entry.line < 1)) throw new Error("Invalid review progress record.");
        if (id.startsWith("review-file:") && !["pending", "reviewed", "follow-up"].includes(entry.disposition)) {
            throw new Error("Whole-file progress requires pending, reviewed or follow-up.");
        }
    }
    return Object.fromEntries(parsed);
}

export function validateReviewCursor(cursor) {
    if (cursor === null) return null;
    if (!cursor || typeof cursor.path !== "string" || !cursor.path || cursor.path.length > 2000
        || !Number.isSafeInteger(cursor.line) || cursor.line < 1 || !["base", "current"].includes(cursor.side)
        || !["base", "current", "diff"].includes(cursor.tab)
        || (cursor.item_id != null && (typeof cursor.item_id !== "string" || cursor.item_id.length > 2000))
        || (cursor.group != null && (typeof cursor.group !== "string" || cursor.group.length > 2000))) {
        throw new Error("Invalid saved review cursor.");
    }
    return { path: cursor.path, line: cursor.line, side: cursor.side, tab: cursor.tab,
        item_id: cursor.item_id || null, group: cursor.group || null };
}

export class ReviewProgressStore {
    constructor(workspacePath) {
        this.directory = workspacePath ? join(workspacePath, "files", "agent-review-progress") : null;
        this.records = new Map();
        this.writes = new Map();
    }

    async read(snapshot) {
        let value = this.records.get(snapshot) || { version: 1, snapshot, revision: 0, entries: {}, cursor: null };
        if (this.directory) {
            const path = join(this.directory, `${createHash("sha256").update(snapshot).digest("hex")}.json`);
            try { value = JSON.parse(await readFile(path, "utf8")); }
            catch (error) { if (error.code !== "ENOENT") throw error; }
        }
        if (value.version !== 1 || value.snapshot !== snapshot || !Number.isSafeInteger(value.revision) || value.revision < 0) {
            throw new Error("Saved review progress does not match this snapshot or schema.");
        }
        return { ...value, entries: validateReviewEntries(value.entries), cursor: validateReviewCursor(value.cursor),
            durable: Boolean(this.directory) };
    }

    async update(snapshot, revision, entries, cursor) {
        if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("A valid review progress revision is required.");
        const nextEntries = validateReviewEntries(entries);
        const nextCursor = validateReviewCursor(cursor);
        const write = async () => {
            const current = await this.read(snapshot);
            if (current.revision !== revision) {
                const error = new Error("Review progress changed elsewhere. Reload the saved progress before retrying; your draft is retained.");
                error.code = "review_progress_conflict";
                throw error;
            }
            const value = { version: 1, snapshot, revision: revision + 1, entries: nextEntries,
                cursor: nextCursor, updated_at: new Date().toISOString() };
            if (this.directory) {
                await mkdir(this.directory, { recursive: true });
                const path = join(this.directory, `${createHash("sha256").update(snapshot).digest("hex")}.json`);
                const temporary = `${path}.${randomUUID()}.tmp`;
                try { await writeFile(temporary, JSON.stringify(value)); await rename(temporary, path); }
                finally { await rm(temporary, { force: true }); }
            } else this.records.set(snapshot, value);
            return { ...value, durable: Boolean(this.directory) };
        };
        const previous = this.writes.get(snapshot) || Promise.resolve();
        const pending = previous.then(write, write);
        this.writes.set(snapshot, pending);
        try { return await pending; }
        finally { if (this.writes.get(snapshot) === pending) this.writes.delete(snapshot); }
    }
}
