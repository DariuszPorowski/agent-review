import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = process.cwd();
const hash = (source) => createHash("sha256").update(source).digest("hex");
const beforeFile = resolve(root, "coverage", "coverage-before.json");
if (process.argv.includes("--before")) {
    await mkdir(resolve(root, "coverage"), { recursive: true });
    const path = "packages/core/src/resolver.js";
    const source = await readFile(resolve(root, path), "utf8");
    await writeFile(beforeFile, JSON.stringify({ [path]: { sha256: hash(source) } }));
    process.exit(0);
}
const before = JSON.parse(await readFile(beforeFile, "utf8"));
const report = JSON.parse(await readFile(resolve(root, "coverage", "coverage-final.json"), "utf8"));
const sources = {};
for (const record of Object.values(report)) {
    const path = relative(root, resolve(record.path)).replaceAll("\\", "/");
    if (path.startsWith("../")) throw new Error(`Coverage source is outside this sample: ${record.path}`);
    const source = await readFile(resolve(root, path), "utf8");
    if (before[path]?.sha256 !== hash(source)) throw new Error(`Source changed during coverage collection: ${path}. Rerun coverage.`);
    sources[path] = before[path];
}
await writeFile(resolve(root, "coverage", "sources.json"), `${JSON.stringify(sources, null, 2)}\n`);
console.log(`Recorded exact source hashes for ${Object.keys(sources).length} coverage file(s).`);
