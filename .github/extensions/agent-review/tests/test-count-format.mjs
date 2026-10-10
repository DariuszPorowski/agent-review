import assert from "node:assert/strict";
import test from "node:test";

import { countLabel, plural } from "../web/count-format.mjs";

test("count labels handle zero, one, many, and irregular plurals", () => {
    assert.equal(countLabel(0, "release"), "0 releases");
    assert.equal(countLabel(1, "release"), "1 release");
    assert.equal(countLabel(2, "release"), "2 releases");
    assert.equal(countLabel(1, "analysis", "analyses"), "1 analysis");
    assert.equal(countLabel(2, "analysis", "analyses"), "2 analyses");
    assert.equal(plural(1, "has", "have"), "has");
    assert.equal(plural(2, "has", "have"), "have");
});
