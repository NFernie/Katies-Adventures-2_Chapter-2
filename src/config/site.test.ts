import assert from "node:assert/strict";
import test from "node:test";
import { BASE_PATH, REPO_NAME } from "./site.ts";

test("GitHub Pages project site basePath is locked", () => {
  assert.equal(REPO_NAME, "Katies-Adventures-2_Chapter-2");
  assert.equal(BASE_PATH, "/Katies-Adventures-2_Chapter-2");
  assert.equal(BASE_PATH.startsWith("/"), true);
  assert.equal(BASE_PATH.endsWith("/"), false);
});
