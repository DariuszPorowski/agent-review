import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("publishing authenticates its generated repository independently of checkout credentials", async () => {
    const workflow = await readFile(new URL("../../../workflows/publish-extension.yml", import.meta.url), "utf8");
    const publish = workflow.slice(workflow.indexOf("\n  publish:"));
    assert.match(publish, /GH_TOKEN: \$\{\{ github\.token \}\}/);
    assert.doesNotMatch(publish, /extraheader|git config --local --get/);
    assert.match(publish, /git config --local "credential\.\$\{SERVER_URL\}\.helper" ""/);
    assert.match(publish, /git config --local --add "credential\.\$\{SERVER_URL\}\.helper" '!gh auth git-credential'/);
    assert.ok(publish.indexOf("!gh auth git-credential") < publish.indexOf("git ls-remote"));
    assert.ok(publish.indexOf("cd \"$DIST_ROOT\"") < publish.indexOf("git config --local"));
});
