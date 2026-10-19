import assert from "node:assert/strict";
import test from "node:test";
import { fileTree, groupForSource, workspaceNavigation } from "../web/review-workspace.mjs";

test("navigation represents every changed file without turning related unchanged source into a changed member", () => {
    const model = { changes: [
        { path: "src/a.js", status: "modified" }, { path: "src/b.js", status: "added" },
        { path: "removed.js", status: "removed" }, { path: "unchanged.js", status: "unchanged" },
    ] };
    const data = { sections: [{ id: "group", title: "Change a", kind: "behavior", ranges: [
        { path: "src/a.js", side: "current", line: 1, end_line: 5 },
        { path: "src/a.js", side: "base", line: 1, end_line: 4 },
        { path: "unchanged.js", side: "current", line: 1, end_line: 3 },
    ] }] };
    const navigation = workspaceNavigation(model, data);
    assert.equal(navigation.files.length, 3);
    assert.deepEqual(navigation.groups[0].files.map((file) => file.path), ["src/a.js"]);
    assert.equal(new Set(navigation.groups.flatMap((group) => group.files.map((file) => file.path))).size, 3);
    assert.equal(groupForSource(navigation, { path: "unchanged.js", start_line: 2 }), null);
});
test("exact range ownership wins over an earlier group in the same file", () => {
    const navigation = workspaceNavigation({ changes: [{ path: "a.js", status: "modified" }] }, { sections: [
        { id: "first", title: "First change", kind: "behavior", ranges: [{ path: "a.js", side: "current", line: 1, end_line: 5 }] },
        { id: "second", title: "Second change", kind: "behavior", ranges: [{ path: "a.js", side: "current", line: 10, end_line: 20 }] },
    ] });
    assert.equal(groupForSource(navigation, { path: "a.js", start_line: 15 }, "first").id, "second");
    assert.equal(groupForSource(navigation, { path: "a.js", start_line: 30 }, "first"), null);
    assert.equal(groupForSource(navigation, { path: "a.js" }, "first").id, "first");
});
test("files remain accessible before grouping completes and their tree preserves exact paths", () => {
    const navigation = workspaceNavigation({ changes: [
        { path: ".generated/data.json", status: "modified" }, { path: "src/routing/a.js", status: "modified" },
        { path: "README.md", status: "modified" },
    ] }, null);
    assert.equal(navigation.groups.length, 1);
    assert.equal(navigation.groups[0].files.length, 3);
    const tree = fileTree(navigation.files);
    assert.equal(tree.files[0].path, "README.md");
    assert.equal(tree.directories.get("src").directories.get("routing").files[0].path, "src/routing/a.js");
});
