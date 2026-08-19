import { loadToolEnv, nutrientsFromFdcFood, readUsdaKey } from "./fdc";

const queries = process.argv.slice(2);
if (!queries.length) {
  console.error("usage: tsx tools/nutrition/search.ts <query>...");
  process.exit(1);
}

loadToolEnv();
const key = readUsdaKey();

type Hit = {
  fdcId: number;
  description?: string;
  dataType?: string;
  foodNutrients?: Array<{
    nutrientId?: number;
    value?: number;
    nutrientName?: string;
  }>;
};

async function search(query: string): Promise<void> {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", key);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      pageSize: 8,
      dataType: ["SR Legacy", "Foundation"],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`search HTTP ${response.status} for ${query}: ${detail.slice(0, 200)}`);
  }
  const body = (await response.json()) as { foods?: Hit[] };
  console.log(`\n## ${query}`);
  for (const food of body.foods ?? []) {
    const nutrients = (food.foodNutrients ?? []).map((row) => ({
      amount: row.value,
      nutrient: { id: row.nutrientId, name: row.nutrientName },
    }));
    const per100g = nutrientsFromFdcFood({
      fdcId: food.fdcId,
      foodNutrients: nutrients,
    });
    console.log(
      `${food.fdcId}\t${food.dataType}\t${food.description}\t${JSON.stringify(per100g)}`,
    );
  }
}

async function main() {
  for (const query of queries) await search(query);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
