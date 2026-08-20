import assert from "node:assert/strict";
import test from "node:test";

import { assertScrapeAllowed, assertSourceAllowed } from "./sources.ts";

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
  assert.throws(
    () => assertScrapeAllowed("https://example.gov/recipes/beans"),
    /no HTML scrape sources are signed off/i,
  );
});

test("Wayback MyPlate recipe and kitchen index URLs are signed off", () => {
  assert.doesNotThrow(() =>
    assertScrapeAllowed(
      "https://web.archive.org/web/20250117181741/https://www.myplate.gov/recipes/2-step-chicken",
    ),
  );
  assert.doesNotThrow(() =>
    assertScrapeAllowed(
      "https://web.archive.org/web/20250117181741id_/https://www.myplate.gov/recipes/2-step-chicken",
    ),
  );
  assert.doesNotThrow(() =>
    assertScrapeAllowed(
      "https://web.archive.org/web/20250124221018/https://www.myplate.gov/myplate-kitchen/recipes",
    ),
  );
});

test("Wayback copies of denied commercial hosts stay blocked", () => {
  assert.throws(
    () =>
      assertScrapeAllowed(
        "https://web.archive.org/web/20200101000000/https://www.allrecipes.com/recipe/pie",
      ),
    /denied source/i,
  );
});

test("myplate.food is not an allowed harvest host", () => {
  assert.throws(
    () => assertScrapeAllowed("https://myplate.food/recipes/2-step-chicken"),
    /denied source/i,
  );
});
