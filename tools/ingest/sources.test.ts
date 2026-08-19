import assert from "node:assert/strict";
import test from "node:test";

import { assertScrapeAllowed, assertSourceAllowed, loadSourceList } from "./sources.ts";

test("denied commercial recipe hosts are blocked", () => {
  assert.throws(
    () => assertSourceAllowed("https://www.allrecipes.com/recipe/123/pie"),
    /denied source/i,
  );
  assert.throws(
    () => assertScrapeAllowed("https://www.bbcgoodfood.com/recipes/x"),
    /denied source/i,
  );
});

test("wger ingredient endpoints are refused", () => {
  assert.throws(
    () => assertSourceAllowed("https://wger.de/api/v2/ingredientinfo/?limit=10"),
    /exercises only/i,
  );
  assert.throws(
    () => assertSourceAllowed("https://wger.de/api/v2/nutritionplan/"),
    /exercises only/i,
  );
});

test("wger exerciseinfo and USDA FDC API hosts are allowed", () => {
  assert.doesNotThrow(() =>
    assertSourceAllowed("https://wger.de/api/v2/exerciseinfo/?language=2"),
  );
  assert.doesNotThrow(() =>
    assertSourceAllowed("https://api.nal.usda.gov/fdc/v1/food/170894"),
  );
});

test("unsigned HTML scrape URLs are refused until content-sources signs them off", () => {
  const sources = loadSourceList();
  assert.deepEqual(sources.signedOffScrapeUrls, []);
  assert.throws(
    () => assertScrapeAllowed("https://example.gov/recipes/beans"),
    /no HTML scrape sources are signed off/i,
  );
});
