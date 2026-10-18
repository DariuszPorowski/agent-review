import assert from "node:assert/strict";
import test from "node:test";
import { parseReviewLocation, reviewLocation } from "../web/review-location.mjs";

test("local review locations round-trip exact snapshot, item, side and range without carrying URL tokens", () => {
    const input = { snapshot: "snapshot:source-hash", item: "finding:one", path: "src/a b.js", line: 42, side: "base", tab: "diff" };
    const link = reviewLocation("http://127.0.0.1:40000/?unrelated=private#old", input);
    assert.equal(new URL(link).search, "");
    assert.deepEqual(parseReviewLocation(new URL(link).hash), input);
});
test("invalid or outside-repository locations are rejected rather than navigated", () => {
    for (const path of ["../outside.js", "/root.js", "C:/repo/a.js", "src\\a.js", "src/./a.js"]) {
        assert.throws(() => parseReviewLocation(`#snapshot=one&path=${encodeURIComponent(path)}&line=1`), /invalid/);
    }
    assert.throws(() => parseReviewLocation("#snapshot=one&path=a.js&line=0"), /invalid/);
    assert.equal(parseReviewLocation(""), null);
});
